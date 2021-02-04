from typing import Any, Dict, Sequence, cast

import requests
from celery import Task
from django.conf import settings
from django.db import transaction
from sentry_sdk import capture_exception

from posthog.celery import app
from posthog.models import Action, Event, Team
from posthog.tasks.webhooks import determine_webhook_type, get_formatted_message


@app.task(ignore_result=True, bind=True, max_retries=3)
def post_event_to_webhook_ee(self: Task, event: Dict[str, Any], team_id: int, site_url: str) -> None:
    if not site_url:
        site_url = settings.SITE_URL
    try:
        team = Team.objects.select_related("organization").get(pk=team_id)
        is_zapier_available = team.organization.is_feature_available("zapier")

        actionFilters = {"team_id": team_id}
        if not is_zapier_available:
            if not team.slack_incoming_webhook:
                return  # Exit this task if neither Zapier nor webhook URL are available
            else:
                actionFilters["post_to_slack"] = True  # We only need to fire for actions that are posted to webhook URL
        actions = cast(Sequence[Action], Action.objects.filter(**actionFilters).all())

        with transaction.atomic():
            transaction.set_rollback(True)  # Roll back Event creation on exit from the atomic block
            ephemeral_postgres_event = Event.objects.create(
                event=event["event"],
                distinct_id=event["distinct_id"],
                properties=event["properties"],
                team=team,
                site_url=site_url,
                **({"timestamp": event["timestamp"]} if event["timestamp"] else {}),
                **({"elements": event["elements_list"]} if event["elements_list"] else {})
            )

            for action in actions:
                qs = Event.objects.filter(pk=ephemeral_postgres_event.pk).query_db_by_action(action)
                if not qs:
                    continue
                # REST hooks
                if is_zapier_available:
                    action.on_perform(ephemeral_postgres_event)
                # webhooks
                if team.slack_incoming_webhook:
                    message_text, message_markdown = get_formatted_message(action, ephemeral_postgres_event, site_url,)
                    if determine_webhook_type(team) == "slack":
                        message = {
                            "text": message_text,
                            "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": message_markdown},},],
                        }
                    else:
                        message = {
                            "text": message_markdown,
                        }
                    requests.post(team.slack_incoming_webhook, verify=False, json=message)
    except:
        capture_exception()
        self.retry(countdown=(2 ** self.request.retries) / 2)

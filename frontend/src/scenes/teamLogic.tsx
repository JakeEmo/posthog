import { kea } from 'kea'
import api from 'lib/api'
import { teamLogicType } from './teamLogicType'
import { TeamType } from '~/types'
import { toast } from 'react-toastify'

export const teamLogic = kea<teamLogicType<TeamType>>({
    actions: {
        deleteCurrentTeam: true,
    },
    loaders: ({ values }) => ({
        currentTeam: [
            null as TeamType | null,
            {
                loadCurrentTeam: async () => {
                    try {
                        return await api.get('api/projects/@current')
                    } catch {
                        return null
                    }
                },
                // no API request in patch as that's handled in userLogic for now
                patchCurrentTeam: (patch: Partial<TeamType>) =>
                    values.currentTeam ? { ...values.currentTeam, ...patch } : null,
                createTeam: async (name: string): Promise<TeamType> => await api.create('api/projects/', { name }),
                resetToken: async () => await api.update('api/projects/@current/reset_token', {}),
            },
        ],
    }),
    listeners: ({ values }) => ({
        deleteCurrentTeam: async () => {
            if (values.currentTeam) {
                toast('Deleting project...')
                await api.delete(`api/projects/${values.currentTeam.id}`)
                location.reload()
            }
        },
        createTeamSuccess: () => {
            window.location.href = '/ingestion'
        },
    }),
    events: ({ actions }) => ({
        afterMount: [actions.loadCurrentTeam],
    }),
})

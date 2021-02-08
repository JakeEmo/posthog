import React from 'react'

import { mount } from '@cypress/react'
import { Provider } from 'react-redux'
import { getContext } from 'kea'
import { initKea } from '~/initKea'
import posthog from 'posthog-js'

export const mountPage = (component, { cssFile } = {}) => {
    initKea()
    return mount(<Provider store={getContext().store}>{component}</Provider>, {
        stylesheets: ['frontend/dist/main.css', `frontend/dist/${cssFile}`],
    })
}

export const setLocation = (path) => {
    window.history.replaceState(null, '', path)
}

export const getSearchParameters = ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const result = {}
    for (const [key, value] of searchParams.entries()) {
        result[key] = value
    }
    return result
}

export const mockPosthog = () => {
    cy.stub(posthog)
    posthog.people = { set: () => {} }
    posthog.onFeatureFlags = (callback) => {
        callback(given.featureFlags || [])
    }
}
describe('Setup', () => {
    it('Setup loaded', () => {
        cy.get('[data-attr=menu-item-project]').click()
        cy.get('[data-attr=layout-content]').should('exist')
    })

    it('See suggestion and save', () => {
        cy.getCookie('csrftoken').then((csrftoken) => {
            cy.request({
                url: '/api/team/@current',
                body: { app_urls: [] },
                method: 'PATCH',
                headers: {
                    'X-CSRFToken': csrftoken.value,
                },
            })
        })
        cy.reload(true)
        cy.get('[data-attr=menu-item-project]').click()
        cy.get('[data-attr=app-url-suggestion]').click()
        cy.get('[data-attr=app-url-item]').should('contain', '/demo')
        cy.title().should('equal', 'Project Settings • PostHog')
    })
})

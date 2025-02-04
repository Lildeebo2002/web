import { merge } from 'lodash-es'
import { describe } from '@jest/globals'
import { shallowMount } from '@vue/test-utils'
import List from 'web-app-files/src/components/Search/List.vue'
import { useResourcesViewDefaults } from 'web-app-files/src/composables'
import { useResourcesViewDefaultsMock } from 'web-app-files/tests/mocks/useResourcesViewDefaultsMock'
import { createRouter, createMemoryHistory } from 'vue-router'

import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  mockAxiosResolve
} from 'web-test-helpers/src'
import { queryItemAsString, useCapabilitySearchModifiedDate } from '@ownclouders/web-pkg'
import { computed, ref } from 'vue'
import { Resource } from '@ownclouders/web-client/src'
import { mock } from 'jest-mock-extended'

jest.mock('web-app-files/src/composables')
jest.mock('@ownclouders/web-pkg', () => ({
  ...jest.requireActual('@ownclouders/web-pkg'),
  queryItemAsString: jest.fn(),
  useAppDefaults: jest.fn(),
  useCapabilitySearchModifiedDate: jest.fn()
}))

const selectors = {
  noContentMessageStub: 'no-content-message-stub',
  resourceTableStub: 'resource-table-stub',
  tagFilter: '.files-search-filter-tags',
  lastModifiedFilter: '.files-search-filter-last-modified',
  fullTextFilter: '.files-search-filter-full-text',
  filter: '.files-search-result-filter'
}

describe('List component', () => {
  it('should render no-content-message if no resources found', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.noContentMessageStub).exists()).toBeTruthy()
  })
  it('should render resource table if resources found', () => {
    const { wrapper } = getWrapper({ resources: [mock<Resource>()] })
    expect(wrapper.find(selectors.resourceTableStub).exists()).toBeTruthy()
  })
  it('resets the initial store file state', () => {
    const { storeOptions } = getWrapper({ resources: [mock<Resource>()] })
    expect(storeOptions.modules.Files.mutations.CLEAR_CURRENT_FILES_LIST).toHaveBeenCalled()
  })
  it('should emit search event on mount', async () => {
    const { wrapper } = getWrapper()
    await wrapper.vm.loadAvailableTagsTask.last
    expect(wrapper.emitted('search').length).toBeGreaterThan(0)
  })
  it('should emit search only if one of the queries changes', async () => {
    const $router = createRouter({
      routes: [{ name: 'files-common-search', path: '/files-common-search', redirect: null }],
      history: createMemoryHistory()
    })

    const { wrapper } = getWrapper({
      mocks: { $router }
    })

    let replacementCounter = 0
    const queries = [{}, {}, {}, {}, {}, {}, {}, {}, { q_tags: 'foo' }, {}, {}, {}, {}]
    for (const query of queries) {
      await $router.replace({
        name: 'files-common-search',
        query: merge(
          {
            q_fullText: 'q_fullText',
            q_tags: 'q_tags',
            q_lastModified: 'q_lastModified',
            useScope: 'useScope'
          },
          query
        )
      })

      replacementCounter++
    }

    await wrapper.vm.loadAvailableTagsTask.last
    expect(replacementCounter).toBe(queries.length)
    expect(wrapper.emitted('search').length).toBe(4)
  })
  describe('breadcrumbs', () => {
    it('show "Search" when no search term given', () => {
      const { wrapper } = getWrapper()
      const appBar = wrapper.findComponent<any>('app-bar-stub')
      expect(appBar.props('breadcrumbs')[0].text).toEqual('Search')
    })
    it('include the search term if given', () => {
      const searchTerm = 'term'
      const { wrapper } = getWrapper({ searchTerm })
      const appBar = wrapper.findComponent<any>('app-bar-stub')
      expect(appBar.props('breadcrumbs')[0].text).toEqual(`Search results for "${searchTerm}"`)
    })
  })
  describe('filter', () => {
    describe('general', () => {
      it('should not be rendered if no filtering is available', async () => {
        const { wrapper } = getWrapper({ fullTextSearchEnabled: false, availableTags: [] })
        await wrapper.vm.loadAvailableTagsTask.last
        expect(wrapper.find(selectors.filter).exists()).toBeFalsy()
      })
    })
    describe('tags', () => {
      it('should show all available tags', async () => {
        const tag = 'tag1'
        const { wrapper } = getWrapper({ availableTags: [tag] })
        await wrapper.vm.loadAvailableTagsTask.last
        expect(wrapper.find(selectors.tagFilter).exists()).toBeTruthy()
        expect(wrapper.findComponent<any>(selectors.tagFilter).props('items')).toEqual([
          { label: tag, id: tag }
        ])
      })
      it('should set initial filter when tags are given via query param', async () => {
        const searchTerm = 'term'
        const availableTags = ['tag1', 'tag2']
        const { wrapper } = getWrapper({
          availableTags,
          searchTerm,
          tagFilterQuery: availableTags.join('+')
        })
        await wrapper.vm.loadAvailableTagsTask.last
        expect(wrapper.emitted('search')[0][0]).toEqual(
          `name:"*${searchTerm}*" AND tag:("${availableTags[0]}" OR "${availableTags[1]}")`
        )
      })
    })

    describe('last modified', () => {
      it('should show available last modified values', async () => {
        const expectation = [
          { label: 'today', id: 'today' },
          { label: 'yesterday', id: 'yesterday' },
          { label: 'this week', id: 'this week' },
          { label: 'last week', id: 'last week' },
          { label: 'last 7 days', id: 'last 7 days' },
          { label: 'this month', id: 'this month' },
          { label: 'last month', id: 'last month' },
          { label: 'last 30 days', id: 'last 30 days' },
          { label: 'this year', id: 'this year' },
          { label: 'last year', id: 'last year' }
        ]
        const lastModifiedValues = {
          keywords: [
            'today',
            'yesterday',
            'this week',
            'last week',
            'last 7 days',
            'this month',
            'last month',
            'last 30 days',
            'this year',
            'last year'
          ]
        }
        const { wrapper } = getWrapper({
          availableLastModifiedValues: lastModifiedValues,
          availableTags: ['tag']
        })
        await wrapper.vm.loadAvailableTagsTask.last

        expect(wrapper.find(selectors.lastModifiedFilter).exists()).toBeTruthy()
        expect(wrapper.findComponent<any>(selectors.lastModifiedFilter).props('items')).toEqual(
          expectation
        )
      })
      it('should set initial filter when last modified is given via query param', async () => {
        const searchTerm = 'Screenshot'
        const lastModifiedFilterQuery = 'today'
        const { wrapper } = getWrapper({
          searchTerm,
          lastModifiedFilterQuery
        })
        await wrapper.vm.loadAvailableTagsTask.last
        expect(wrapper.emitted('search')[0][0]).toEqual(
          `name:"*${searchTerm}*" AND mtime:"${lastModifiedFilterQuery}"`
        )
      })
    })

    describe('fullText', () => {
      it('should render filter if enabled via capabilities', () => {
        const { wrapper } = getWrapper({ fullTextSearchEnabled: true })
        expect(wrapper.find(selectors.fullTextFilter).exists()).toBeTruthy()
      })
      it('should set initial filter when fullText is set active via query param', async () => {
        const searchTerm = 'term'
        const { wrapper } = getWrapper({
          searchTerm,
          fullTextFilterQuery: 'true',
          fullTextSearchEnabled: true
        })
        await wrapper.vm.loadAvailableTagsTask.last
        expect(wrapper.emitted('search')[0][0]).toEqual(`content:"${searchTerm}"`)
      })
    })
  })
})

function getWrapper({
  availableTags = [],
  resources = [],
  searchTerm = '',
  tagFilterQuery = null,
  fullTextFilterQuery = null,
  fullTextSearchEnabled = false,
  availableLastModifiedValues = {},
  lastModifiedFilterQuery = null,
  mocks = {}
} = {}) {
  jest.mocked(queryItemAsString).mockImplementationOnce(() => searchTerm)
  jest.mocked(queryItemAsString).mockImplementationOnce(() => fullTextFilterQuery)
  jest.mocked(queryItemAsString).mockImplementationOnce(() => tagFilterQuery)
  jest.mocked(queryItemAsString).mockImplementationOnce(() => lastModifiedFilterQuery)
  jest
    .mocked(useCapabilitySearchModifiedDate)
    .mockReturnValue(computed(() => availableLastModifiedValues as any))

  const resourcesViewDetailsMock = useResourcesViewDefaultsMock({
    paginatedResources: ref(resources)
  })
  jest.mocked(useResourcesViewDefaults).mockImplementation(() => resourcesViewDetailsMock)

  const localMocks = {
    ...defaultComponentMocks(),
    ...mocks
  }
  localMocks.$clientService.graphAuthenticated.tags.getTags.mockReturnValue(
    mockAxiosResolve({ value: availableTags })
  )
  const storeOptions = defaultStoreMockOptions
  storeOptions.getters.capabilities.mockReturnValue({
    files: { tags: true, full_text_search: fullTextSearchEnabled }
  })
  const store = createStore(storeOptions)
  return {
    storeOptions,
    mocks: localMocks,
    wrapper: shallowMount(List, {
      global: {
        mocks: localMocks,
        provide: localMocks,
        stubs: {
          FilesViewWrapper: false
        },
        plugins: [...defaultPlugins(), store]
      }
    })
  }
}

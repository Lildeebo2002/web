import SpaceDetails from 'web-pkg/src/components/sideBar/Spaces/Details/SpaceDetails.vue'
import { spaceRoleManager, ShareTypes } from 'web-client/src/helpers/share'
import {
  createStore,
  defaultPlugins,
  shallowMount,
  defaultStoreMockOptions
} from 'web-test-helpers'

const spaceMock = {
  type: 'space',
  name: ' space',
  id: '1',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  spaceRoles: {
    manager: [],
    editor: [],
    viewer: []
  },
  spaceQuota: {
    used: 100,
    total: 1000
  }
}

const spaceShare = {
  id: '1',
  shareType: ShareTypes.space.value,
  collaborator: {
    onPremisesSamAccountName: 'Alice',
    displayName: 'alice'
  },
  role: {
    name: spaceRoleManager.name
  }
}

const selectors = {
  spaceImage: '.oc-space-details-sidebar-image',
  spaceMembers: '.oc-space-details-sidebar-members'
}

describe('Details SideBar Panel', () => {
  it('displays the details side panel', () => {
    const { wrapper } = createWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('does not render the space image if disabled via property', () => {
    const { wrapper } = createWrapper({ props: { showSpaceImage: false } })
    expect(wrapper.find(selectors.spaceImage).exists()).toBeFalsy()
  })
  it('does not render the space members count if spaceResource is given', () => {
    const { wrapper } = createWrapper({ props: { spaceResource: spaceMock } })
    expect(wrapper.find(selectors.spaceMembers).exists()).toBeFalsy()
  })
})

function createWrapper({ spaceResource = spaceMock, props = {} } = {}) {
  const storeOptions = defaultStoreMockOptions
  storeOptions.getters.user.mockImplementation(() => ({ id: 'marie' }))
  storeOptions.modules.runtime.modules.spaces.getters.spaceMembers.mockImplementation(() => [
    spaceShare
  ])
  storeOptions.modules.Files.getters.highlightedFile.mockImplementation(() => spaceResource)
  storeOptions.modules.Files.getters.currentFileOutgoingCollaborators.mockImplementation(() => [
    spaceShare
  ])
  const store = createStore(storeOptions)
  return {
    wrapper: shallowMount(SpaceDetails, {
      props: { ...props },
      global: {
        plugins: [...defaultPlugins(), store],
        directives: {
          OcTooltip: jest.fn()
        },
        provide: {
          displayedItem: spaceResource
        }
      }
    })
  }
}

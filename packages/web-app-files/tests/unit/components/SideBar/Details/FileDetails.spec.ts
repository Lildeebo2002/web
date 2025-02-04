import FileDetails from '../../../../../src/components/SideBar/Details/FileDetails.vue'
import { ShareTypes } from '@ownclouders/web-client/src/helpers/share'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  RouteLocation
} from 'web-test-helpers'
import { mock, mockDeep } from 'jest-mock-extended'
import { Resource, SpaceResource } from '@ownclouders/web-client/src/helpers'
import { createLocationSpaces, createLocationPublic } from '@ownclouders/web-pkg/'
import { mount } from '@vue/test-utils'

const getResourceMock = ({
  type = 'file',
  mimeType = 'image/jpeg',
  tags = [],
  thumbnail = null,
  shareTypes = [],
  share = null,
  path = '/somePath/someResource',
  locked = false,
  canEditTags = true
} = {}) =>
  mock<Resource>({
    id: '1',
    type,
    isFolder: type === 'folder',
    mimeType,
    ownerId: 'marie',
    ownerDisplayName: 'Marie',
    owner: null,
    mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
    tags,
    size: '740',
    path,
    thumbnail,
    shareTypes,
    share,
    locked,
    canEditTags: jest.fn(() => canEditTags)
  })

const selectors = {
  ownerDisplayName: '[data-testid="ownerDisplayName"]',
  preview: '[data-testid="preview"]',
  resourceIcon: '.details-icon',
  lockedBy: '[data-testid="locked-by"]',
  sharedBy: '[data-testid="shared-by"]',
  sharedVia: '[data-testid="shared-via"]',
  sharingInfo: '[data-testid="sharingInfo"]',
  sizeInfo: '[data-testid="sizeInfo"]',
  tags: '[data-testid="tags"]',
  timestamp: '[data-testid="timestamp"]',
  versionsInfo: '[data-testid="versionsInfo"]'
}

describe('Details SideBar Panel', () => {
  describe('preview', () => {
    describe('shows preview area', () => {
      it('while trying to load a preview', () => {
        const resource = getResourceMock()
        const { wrapper } = createWrapper({ resource })
        expect(wrapper.find(selectors.preview).exists()).toBeTruthy()
        expect(wrapper.find(selectors.resourceIcon).exists()).toBeFalsy()
      })
      it('for allowed mime types', () => {
        const resource = getResourceMock()
        const { wrapper } = createWrapper({ resource })
        expect(wrapper.find(selectors.preview).exists()).toBeTruthy()
        expect(wrapper.find(selectors.resourceIcon).exists()).toBeFalsy()
      })
    })
    it('shows resource icon instead if the resource is a folder', () => {
      const resource = getResourceMock({ type: 'folder' })
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.preview).exists()).toBeFalsy()
      expect(wrapper.find(selectors.resourceIcon).exists()).toBeTruthy()
    })
  })
  describe('status indicators', () => {
    it('show if given on non-public page', () => {
      const resource = getResourceMock({ shareTypes: [ShareTypes.user.value] })
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.sharingInfo).exists()).toBeTruthy()
    })
    it('do not show on a public page', () => {
      const resource = getResourceMock({ shareTypes: [ShareTypes.user.value] })
      const { wrapper } = createWrapper({ resource, isPublicLinkContext: true })
      expect(wrapper.find(selectors.sharingInfo).exists()).toBeFalsy()
    })
  })
  describe('timestamp', () => {
    it('shows if given', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.timestamp).exists()).toBeTruthy()
    })
  })
  describe('locked by', () => {
    it('shows if the resource is locked', () => {
      const resource = getResourceMock({ locked: true })
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.lockedBy).exists()).toBeTruthy()
    })
  })
  describe('shared via', () => {
    it('shows if the resource has an indirect share', () => {
      const resource = getResourceMock()
      const ancestorMetaData = {
        '/somePath': { path: '/somePath', shareTypes: [ShareTypes.user.value] }
      }
      const { wrapper } = createWrapper({ resource, ancestorMetaData })
      expect(wrapper.find(selectors.sharedVia).exists()).toBeTruthy()
    })
  })
  describe('shared by', () => {
    it('shows if the resource is a share from another user', () => {
      const share = { fileOwner: { displayName: 'Marie' } }
      const resource = getResourceMock({ shareTypes: [ShareTypes.user.value], share })
      const { wrapper } = createWrapper({ resource, user: { id: 'einstein' } })
      expect(wrapper.find(selectors.sharedBy).exists()).toBeTruthy()
    })
  })
  describe('owner display name', () => {
    it('shows if given', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.ownerDisplayName).exists()).toBeTruthy()
    })
  })
  describe('size', () => {
    it('shows if given', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.sizeInfo).exists()).toBeTruthy()
    })
  })
  describe('versions', () => {
    it('show if given for files on a private page', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource, versions: ['1'] })
      expect(wrapper.find(selectors.versionsInfo).exists()).toBeTruthy()
    })
    it('do not show for folders on a private page', () => {
      const resource = getResourceMock({ type: 'folder' })
      const { wrapper } = createWrapper({ resource, versions: ['1'] })
      expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
    })
    it('do not show on public pages', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource, versions: ['1'], isPublicLinkContext: true })
      expect(wrapper.find(selectors.versionsInfo).exists()).toBeFalsy()
    })
  })

  describe('tags', () => {
    it('shows when enabled via capabilities', async () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.tags).exists()).toBeTruthy()
    })
    it('does not show when disabled via capabilities', () => {
      const resource = getResourceMock()
      const { wrapper } = createWrapper({ resource, tagsEnabled: false })
      expect(wrapper.find(selectors.tags).exists()).toBeFalsy()
    })
    it('does not show for root folders', () => {
      const resource = getResourceMock({ path: '/' })
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.tags).exists()).toBeTruthy()
    })
    it('shows as disabled when permission not set', () => {
      const resource = getResourceMock({ canEditTags: false })
      const { wrapper } = createWrapper({ resource })
      expect(wrapper.find(selectors.tags).find('.vs--disabled ').exists()).toBeTruthy()
    })
    it('should use router-link on private page', async () => {
      const resource = getResourceMock({ tags: ['moon', 'mars'] })
      const { wrapper } = createWrapper({ resource })
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.tags).find('router-link-stub').exists()).toBeTruthy()
    })
    it('should not use router-link on public page', async () => {
      const resource = getResourceMock({ tags: ['moon', 'mars'] })
      const { wrapper } = createWrapper({ resource, isPublicLinkContext: true })
      await wrapper.vm.$nextTick()
      expect(wrapper.find(selectors.tags).find('router-link-stub').exists()).toBeFalsy()
    })
  })
})

function createWrapper({
  resource = null,
  isPublicLinkContext = false,
  ancestorMetaData = {},
  user = { id: 'marie' },
  versions = [],
  tagsEnabled = true
} = {}) {
  const storeOptions = defaultStoreMockOptions
  storeOptions.getters.user.mockReturnValue(user)
  storeOptions.modules.Files.getters.versions.mockReturnValue(versions)
  storeOptions.getters.capabilities.mockReturnValue({ files: { tags: tagsEnabled } })
  storeOptions.modules.runtime.modules.ancestorMetaData.getters.ancestorMetaData.mockReturnValue(
    ancestorMetaData
  )
  storeOptions.modules.runtime.modules.auth.getters.isPublicLinkContextReady.mockReturnValue(
    isPublicLinkContext
  )
  const store = createStore(storeOptions)

  const spacesLocation = createLocationSpaces('files-spaces-generic')
  const publicLocation = createLocationPublic('files-public-link')
  const currentRoute = isPublicLinkContext ? publicLocation : spacesLocation
  const mocks = defaultComponentMocks({ currentRoute: mock<RouteLocation>(currentRoute as any) })
  return {
    wrapper: mount(FileDetails, {
      global: {
        stubs: { 'router-link': true, 'oc-resource-icon': true },
        provide: {
          ...mocks,
          resource,
          space: mockDeep<SpaceResource>()
        },
        plugins: [...defaultPlugins(), store],
        mocks
      }
    })
  }
}

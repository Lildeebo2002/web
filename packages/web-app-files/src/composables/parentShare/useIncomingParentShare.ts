import { buildShare } from '@ownclouders/web-client/src/helpers/share'
import { useCapabilitySpacesEnabled, useClientService, useStore } from '@ownclouders/web-pkg'
import { computed, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  buildSpace,
  buildWebDavSpacesPath,
  isMountPointSpaceResource,
  isPersonalSpaceResource,
  Resource,
  SpaceResource
} from '@ownclouders/web-client/src/helpers'
import { DavProperty } from '@ownclouders/web-client/src/webdav/constants'

export function useIncomingParentShare() {
  const store = useStore()
  const clientService = useClientService()
  const incomingParentShare = ref(null)
  const incomingCollaborators = computed(() => store.getters['Files/incomingCollaborators'])
  const hasSpaces = useCapabilitySpacesEnabled(store)

  const loadIncomingParentShare = useTask(function* (signal, resource) {
    let parentShare
    const incoming = unref(incomingCollaborators).find((s) => s.itemSource === resource.id)
    if (incoming) {
      incomingParentShare.value = incoming
      return
    }

    if (resource.shareId) {
      parentShare = yield clientService.owncloudSdk.shares.getShare(resource.shareId)
      if (parentShare) {
        incomingParentShare.value = buildShare(parentShare.shareInfo, resource, true)
        return
      }
    }

    const matchingSpace = getMatchingSpace(resource.id)
    if (!matchingSpace) {
      // no matching space found => the file doesn't lie in own spaces => it's a share.
      try {
        incomingParentShare.value = yield getParentShare(resource)
      } catch (e) {
        incomingParentShare.value = null
        return
      }

      return
    }

    incomingParentShare.value = null
  })

  const getParentShare = async (resource: Resource) => {
    await store.dispatch('runtime/spaces/loadMountPoints', {
      graphClient: clientService.graphAuthenticated
    })
    // do PROPFINDs on parents until root of accepted share is found in `mountpoint` spaces
    let mountPoint = findMatchingMountPoint(resource.id)
    const sharePathSegments = mountPoint ? [] : [resource.name]
    let tmpResource = resource
    while (!mountPoint) {
      tmpResource = await fetchFileInfoById(tmpResource.parentFolderId)
      mountPoint = findMatchingMountPoint(tmpResource.id)
      if (!mountPoint) {
        sharePathSegments.unshift(tmpResource.name)
      }
    }

    const parentShare = await clientService.owncloudSdk.shares.getShare(mountPoint.nodeId)
    return buildShare(parentShare.shareInfo, tmpResource, true)
  }

  const getMatchingSpace = (id) => {
    if (!unref(hasSpaces)) {
      return store.getters['runtime/spaces/spaces'].find((space) => isPersonalSpaceResource(space))
    }
    return store.getters['runtime/spaces/spaces'].find((space) => id.startsWith(space.id))
  }

  const fetchFileInfoById = async (id: string | number): Promise<Resource> => {
    const space = buildSpace({
      id: id.toString(),
      name: '',
      webDavPath: buildWebDavSpacesPath(id)
    })
    return await clientService.webdav.getFileInfo(
      space,
      {},
      {
        davProperties: [
          DavProperty.FileId,
          DavProperty.FileParent,
          DavProperty.Name,
          DavProperty.ResourceType
        ]
      }
    )
  }

  const findMatchingMountPoint = (id: string | number): SpaceResource => {
    return store.getters['runtime/spaces/spaces'].find(
      (space) => isMountPointSpaceResource(space) && space.root?.remoteItem?.id === id
    )
  }

  return { loadIncomingParentShare, incomingParentShare }
}

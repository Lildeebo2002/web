import { Resource } from '@ownclouders/web-client'
import {
  extractParentFolderName,
  isProjectSpaceResource,
  isShareRoot,
  isShareSpaceResource
} from '@ownclouders/web-client/src/helpers'
import { useGettext } from 'vue3-gettext'
import { unref } from 'vue'
import { useCapabilityProjectSpacesEnabled, useCapabilityShareJailEnabled } from '../capability'
import { useGetMatchingSpace } from '../spaces'
import path, { dirname } from 'path'
import { ResourceRouteResolverOptions, useResourceRouteResolver } from '../filesList'
import { createLocationShares, createLocationSpaces } from '../../router'

export const useFolderLink = (options: ResourceRouteResolverOptions = {}) => {
  const { $gettext } = useGettext()
  const hasShareJail = useCapabilityShareJailEnabled()
  const hasProjectSpaces = useCapabilityProjectSpacesEnabled()
  const { getInternalSpace, getMatchingSpace, isResourceAccessible } = useGetMatchingSpace()
  const { createFolderLink } = useResourceRouteResolver(options)

  const getPathPrefix = (resource: Resource) => {
    const space = unref(options.space) || getMatchingSpace(resource)

    if (isProjectSpaceResource(space)) {
      return path.join($gettext('Spaces'), space.name)
    }

    if (isShareSpaceResource(space)) {
      return path.join($gettext('Shares'), space.name)
    }

    return space.name
  }
  const getFolderLink = (resource: Resource) => {
    return createFolderLink({
      path: resource.path,
      fileId: resource.fileId,
      resource
    })
  }

  const getParentFolderLink = (resource: Resource) => {
    const space = unref(options.space) || getMatchingSpace(resource)
    const parentFolderAccessible = isResourceAccessible({
      space,
      path: dirname(resource.path)
    })
    if ((resource.shareId && resource.path === '/') || !parentFolderAccessible) {
      return createLocationShares('files-shares-with-me')
    }
    if (isProjectSpaceResource(resource)) {
      return createLocationSpaces('files-spaces-projects')
    }

    return createFolderLink({
      path: dirname(resource.path),
      ...(resource.parentFolderId && { fileId: resource.parentFolderId }),
      resource
    })
  }

  const getParentFolderName = (resource: Resource) => {
    const space = unref(options.space) || getMatchingSpace(resource)
    const parentFolderAccessible = isResourceAccessible({
      space,
      path: dirname(resource.path)
    })
    if (isShareRoot(resource) || !parentFolderAccessible) {
      return $gettext('Shared with me')
    }
    const parentFolder = extractParentFolderName(resource)
    if (parentFolder) {
      return parentFolder
    }

    if (isShareSpaceResource(space)) {
      return space.name
    }

    if (unref(hasProjectSpaces)) {
      if (isProjectSpaceResource(resource)) {
        return $gettext('Spaces')
      }
      if (space?.driveType === 'project') {
        return space.name
      }
    }

    if (!unref(hasShareJail)) {
      return $gettext('All files and folders')
    }

    return $gettext('Personal')
  }

  const getParentFolderLinkIconAdditionalAttributes = (resource: Resource) => {
    // Identify if resource is project space or is part of a project space and the resource is located in its root
    if (
      isProjectSpaceResource(resource) ||
      (isProjectSpaceResource(getInternalSpace(resource.storageId) || ({} as Resource)) &&
        resource.path.split('/').length === 2)
    ) {
      return {
        name: 'layout-grid',
        'fill-type': 'fill'
      }
    }

    return {}
  }

  return {
    getPathPrefix,
    getFolderLink,
    getParentFolderLink,
    getParentFolderName,
    getParentFolderLinkIconAdditionalAttributes
  }
}

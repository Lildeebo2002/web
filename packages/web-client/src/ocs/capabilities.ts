import { AxiosInstance } from 'axios'
import get from 'lodash-es/get'

/* eslint-disable camelcase */
export interface AppProviderCapability {
  apps_url: string
  enabled: boolean
  new_url: string
  open_url: string
  version: string
}

export interface PasswordPolicyCapability {
  min_characters?: number
  max_characters?: number
  min_lowercase_characters?: number
  min_uppercase_characters?: number
  min_digits?: number
  min_special_characters?: number
}

export interface PasswordEnforcedForCapability {
  read_only?: boolean
  read_write?: boolean
  upload_only?: boolean
  read_write_delete?: boolean
}

export interface PublicExpirationCapability {
  days?: string
  enabled?: boolean
  enforced?: boolean
}

export interface LastModifiedFilterCapability {
  keywords?: string[]
  enabled?: boolean
}

export interface MediaTypeCapability {
  keywords?: string[]
  enabled?: boolean
}

export interface Capabilities {
  capabilities: {
    password_policy?: PasswordPolicyCapability
    search: {
      property: {
        mtime: LastModifiedFilterCapability
        mimetype: MediaTypeCapability
      }
    }
    notifications: {
      ocs_endpoints: string[]
    }
    core: {
      pollinterval: number
      status: {
        edition: string
        installed: boolean
        maintenance: boolean
        needsDbUpgrade: boolean
        product: string
        productname?: string
        productversion?: string
        version: string
        versionstring: string
      }
      'support-url-signing': boolean
      'webdav-root': string
    }
    dav: {
      reports: string[]
    }
    files: {
      app_providers?: AppProviderCapability[]
      archivers?: {
        archiver_url: string
        enabled: boolean
        formats: string[]
        max_num_files: string
        max_size: string
        version: string
      }[]
      favorites: boolean
      privateLinks: boolean
      tus_support?: {
        extension: string
        http_method_override: string
        max_chunk_size: number
        resumable: string
        version: string
      }
      undelete: boolean
      versioning: true
    }
    files_sharing: {
      api_enabled: boolean
      default_permissions: number
      federation: {
        incoming: boolean
        outgoing: boolean
      }
      group_sharing: boolean
      public: {
        alias?: boolean
        can_edit: boolean
        enabled: boolean
        expire_date: PublicExpirationCapability
        multiple: boolean
        password: {
          enforced: boolean
          enforced_for: PasswordEnforcedForCapability
        }
        send_mail: boolean
        supports_upload_only: boolean
        upload: boolean
      }
      resharing: boolean
      search_min_length: number
      user: {
        profile_picture: boolean
        send_mail: boolean
        settings: {
          enabled: boolean
          version: string
        }[]
      }
      quick_link?: {
        default_role?: string
      }
    }
    spaces?: {
      enabled?: boolean
      projects?: boolean
      share_jail?: boolean
      version?: string
    }
  }
  version: {
    edition: string
    major: string
    minor: string
    micro: string
    product: string
    productversion?: string
    string: string
  }
}
/* eslint-enable camelcase */

export const GetCapabilitiesFactory = (baseURI: string, axios: AxiosInstance) => {
  const url = new URL(baseURI)
  url.pathname = [...url.pathname.split('/'), 'cloud', 'capabilities'].filter(Boolean).join('/')
  url.searchParams.append('format', 'json')
  const endpoint = url.href
  return {
    async getCapabilities(): Promise<Capabilities> {
      const response = await axios.get(endpoint)
      return get(response, 'data.ocs.data', { capabilities: null, version: null })
    }
  }
}

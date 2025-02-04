import { Store } from 'vuex'
import { computed, Ref, unref } from 'vue'
import { useAppMeta } from './useAppMeta'
import type { AppConfigObject } from '../../apps'

export interface AppConfigOptions {
  store: Store<any>
  applicationId: string
}

export interface AppConfigResult {
  applicationConfig: Ref<AppConfigObject>
}

export function useAppConfig(options: AppConfigOptions): AppConfigResult {
  const applicationMetaResult = useAppMeta(options)
  const applicationConfig = computed(
    () => unref(applicationMetaResult.applicationMeta).config || {}
  )

  return {
    applicationConfig
  }
}

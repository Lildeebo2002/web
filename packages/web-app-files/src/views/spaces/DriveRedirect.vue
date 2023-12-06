<template>
  <div class="oc-flex oc-width-1-1">
    <app-loading-spinner />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, unref } from 'vue'
import { useRoute, useRouter, useStore } from '@ownclouders/web-pkg'
import { AppLoadingSpinner } from '@ownclouders/web-pkg'
import { createFileRouteOptions } from '@ownclouders/web-pkg'
import { createLocationSpaces } from '@ownclouders/web-pkg'

// 'personal/home' is used as personal drive alias from static contexts
// (i.e. places where we can't load the actual personal space)
const fakePersonalDriveAlias = 'personal/home'

export default defineComponent({
  name: 'DriveRedirect',
  components: {
    AppLoadingSpinner
  },
  props: {
    driveAliasAndItem: {
      type: String,
      required: false,
      default: ''
    }
  },
  setup(props) {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()

    const personalSpace = computed(() => {
      return store.getters['runtime/spaces/spaces'].find((space) => space.driveType === 'personal')
    })

    if (!unref(personalSpace)) {
      router.replace(createLocationSpaces('files-spaces-projects'))
    } else {
      const { params, query } = createFileRouteOptions(unref(personalSpace))
      router
        .replace({
          ...unref(route),
          params: {
            ...unref(route).params,
            ...params
          },
          query
        })
        // avoid NavigationDuplicated error in console
        .catch(() => {})
    }
  }
})
</script>

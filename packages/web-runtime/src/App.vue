<template>
  <portal-target name="app.app-banner" multiple />
  <div id="web">
    <oc-hidden-announcer :announcement="announcement" level="polite" />
    <skip-to target="web-content-main">
      <span v-text="$gettext('Skip to main')" />
    </skip-to>
    <component :is="layout"></component>
    <portal-target name="app.runtime.modal" multiple />
    <oc-modal
      v-if="modal.displayed"
      :variation="modal.variation"
      :icon="modal.icon"
      :title="modal.title"
      :message="modal.message"
      :has-input="modal.hasInput"
      :input-description="modal.inputDescription"
      :input-placeholder="modal.inputPlaceholder"
      :input-password-policy="modal.inputPasswordPolicy"
      :input-generate-password-method="modal.inputGeneratePasswordMethod"
      :input-disabled="modal.inputDisabled"
      :input-error="modal.inputError"
      :input-label="modal.inputLabel"
      :input-selection-range="modal.inputSelectionRange"
      :input-type="modal.inputType"
      :input-value="modal.inputValue"
      :button-secondary-text="modal.buttonSecondaryText"
      :without-button-confirm="modal.withoutButtonConfirm"
      :button-cancel-text="modal.cancelText"
      :button-confirm-text="modal.confirmText"
      :button-confirm-disabled="modal.confirmDisabled || !!modal.inputError"
      :checkbox-label="modal.checkboxLabel"
      :contextual-helper-label="modal.contextualHelperLabel"
      :contextual-helper-data="modal.contextualHelperData"
      :hide-actions="modal.hideActions"
      @cancel="onModalCancel"
      @confirm="onModalConfirm"
      @input="modal.onInput"
      @checkbox-changed="modal.onCheckboxValueChanged"
      @confirm-secondary="onModalConfirmSecondary"
      @passwordChallengeCompleted="modal.onPasswordChallengeCompleted"
      @passwordChallengeFailed="modal.onPasswordChallengeFailed"
      @mounted="focusModal"
      @before-unmount="focusModal"
    >
      <template v-if="modal.customContent || modal.customComponent" #content>
        <div v-if="modal.customContent" v-html="modal.customContent" />
        <component
          :is="modal.customComponent"
          v-else
          ref="modalComponent"
          :modal="modal"
          v-bind="modal.customComponentAttrs"
        />
      </template>
    </oc-modal>
  </div>
</template>
<script lang="ts">
import { mapGetters, mapState } from 'vuex'
import SkipTo from './components/SkipTo.vue'
import LayoutApplication from './layouts/Application.vue'
import LayoutLoading from './layouts/Loading.vue'
import LayoutPlain from './layouts/Plain.vue'
import { computed, defineComponent, ref, unref, watch, VNodeRef } from 'vue'
import { isPublicLinkContext, isUserContext } from './router'
import { additionalTranslations } from './helpers/additionalTranslations' // eslint-disable-line
import { eventBus, useRouter } from '@ownclouders/web-pkg'
import { useHead } from './composables/head'
import { useStore } from '@ownclouders/web-pkg'
import { RouteLocation } from 'vue-router'

export default defineComponent({
  components: {
    SkipTo
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    useHead({ store })

    const activeRoute = computed(() => router.resolve(unref(router.currentRoute)))

    const modalComponent = ref<VNodeRef>()
    const onModalConfirm = (...args) => {
      if (store.state.modal.onConfirm) {
        return store.state.modal.onConfirm(...args, { component: modalComponent })
      }
      if ((unref(modalComponent) as any)?.onConfirm) {
        return (unref(modalComponent) as any)?.onConfirm()
      }
    }
    const onModalConfirmSecondary = (...args) => {
      if (store.state.modal.onConfirmSecondary) {
        return store.state.modal.onConfirmSecondary(...args, { component: modalComponent })
      }
      if ((unref(modalComponent) as any)?.onConfirmSecondary) {
        return (unref(modalComponent) as any)?.onConfirmSecondary()
      }
    }
    const onModalCancel = (...args) => {
      if (store.state.modal.onCancel) {
        return store.state.modal.onCancel(...args, { component: modalComponent })
      }
      if ((unref(modalComponent) as any)?.onCancel) {
        return (unref(modalComponent) as any)?.onCancel()
      }
    }

    watch(
      () => unref(activeRoute),
      (newRoute, oldRoute) => {
        const getAppFromRoute = (route: RouteLocation): string => {
          return route?.path?.split('/')?.[1]
        }

        const oldApp = getAppFromRoute(oldRoute)
        const newApp = getAppFromRoute(newRoute)

        if (oldApp === newApp) {
          return
        }

        if ('driveAliasAndItem' in newRoute.params) {
          return
        }

        /*
         * If app has been changed and no file context is set, we will reset current folder.
         */
        store.commit('Files/SET_CURRENT_FOLDER', null)
      }
    )

    return {
      modalComponent,
      onModalConfirm,
      onModalCancel,
      onModalConfirmSecondary
    }
  },
  data() {
    return {
      windowWidth: 0,
      announcement: '',
      activeBlobStyle: {}
    }
  },
  computed: {
    ...mapState(['modal']),
    ...mapGetters(['configuration']),
    ...mapGetters('runtime/auth', ['isUserContextReady', 'isPublicLinkContextReady']),
    layout() {
      const plainLayoutRoutes = [
        'login',
        'logout',
        'oidcCallback',
        'oidcSilentRedirect',
        'resolvePublicLink',
        'accessDenied'
      ]
      if (!this.$route.name || plainLayoutRoutes.includes(this.$route.name as string)) {
        return LayoutPlain
      }
      if (isPublicLinkContext(this.$router, this.$route)) {
        return this.isPublicLinkContextReady ? LayoutApplication : LayoutLoading
      }
      if (isUserContext(this.$router, this.$route)) {
        return this.isUserContextReady ? LayoutApplication : LayoutLoading
      }
      return LayoutApplication
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler: function (to) {
        const extracted = this.extractPageTitleFromRoute(to)
        if (!extracted) {
          return
        }
        const { shortDocumentTitle, fullDocumentTitle } = extracted
        this.announceRouteChange(shortDocumentTitle)
        document.title = fullDocumentTitle
      }
    }
  },
  mounted() {
    eventBus.subscribe(
      'runtime.documentTitle.changed',
      ({ shortDocumentTitle, fullDocumentTitle }) => {
        document.title = fullDocumentTitle
        this.announceRouteChange(shortDocumentTitle)
      }
    )
  },
  methods: {
    focusModal(component, event) {
      ;(this as any).focus({
        revert: event === 'beforeUnmount'
      })
    },

    announceRouteChange(pageTitle) {
      this.announcement = this.$gettext('Navigated to %{ pageTitle }', { pageTitle })
    },

    extractPageTitleFromRoute(route) {
      const routeTitle = route.meta.title ? this.$gettext(route.meta.title) : undefined
      if (!routeTitle) {
        return
      }
      const glue = ' - '
      const titleSegments = [routeTitle]
      const generalName = this.configuration.currentTheme.general.name
      return {
        shortDocumentTitle: titleSegments.join(glue),
        fullDocumentTitle: [...titleSegments, generalName].join(glue)
      }
    }
  }
})
</script>
<style lang="scss">
body {
  margin: 0;
}

#web {
  background-color: var(--oc-color-swatch-brand-default);
  height: 100vh;
  max-height: 100vh;
  overflow-y: hidden;

  .mark-highlight {
    font-weight: 600;
  }
}

iframe {
  border: 0;
}
</style>

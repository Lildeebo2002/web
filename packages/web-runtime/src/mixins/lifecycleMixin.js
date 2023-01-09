export default {
  emits: ['beforeDestroy', 'mounted', 'updated'],
  mounted() {
    this.$nextTick(() => this.$emit('mounted', this, 'mounted'))
  },
  beforeDestroy() {
    this.$emit('beforeDestroy', this, 'beforeDestroy')
  },
  updated() {
    this.$nextTick(() => this.$emit('updated', this, 'updated'))
  }
}

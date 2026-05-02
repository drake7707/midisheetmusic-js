/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, watch, onMounted } from 'vue';
const props = defineProps();
const canvasEl = ref(null);
function getCtx() {
    return canvasEl.value?.getContext('2d') ?? null;
}
function drawPiano() {
    const ctx = getCtx();
    if (!ctx || !props.piano)
        return;
    const canvas = canvasEl.value;
    canvas.width = props.piano.getWidth();
    canvas.height = props.piano.getHeight();
    props.piano.Draw(ctx);
}
watch(() => props.piano, drawPiano);
onMounted(drawPiano);
const __VLS_exposed = { getCtx, drawPiano };
defineExpose(__VLS_exposed);
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "piano-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['piano-wrapper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.canvas, __VLS_intrinsics.canvas)({
    ref: "canvasEl",
    ...{ class: "piano-canvas" },
});
/** @type {__VLS_StyleScopedClasses['piano-canvas']} */ ;
const __VLS_export = (await import('vue')).defineComponent({
    setup: () => (__VLS_exposed),
    __typeProps: {},
});
export default {};

/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
/**
 * SettingsDrawer — quick-access slide-in navigation drawer, ported from
 * the Android settings_drawer.xml layout.
 *
 * Sections (matching Android layout exactly):
 *   • Switch: Scroll Vertically
 *   • Switch: Use Note Colors
 *   • Switch: Color Accidentals
 *   • Loop row (switch + expand arrow → loop start/end sub-items)
 *   • Switch: Show Measure Numbers
 *   • Switch: Show Beat Markers
 *   • Divider
 *   • Button: More Settings  (→ opens full SettingsPage)
 *   • Button: Save As Images (not yet implemented, disabled)
 */
import { reactive, watch, ref } from 'vue';
const props = defineProps();
const emit = defineEmits();
function cloneOpts(o) {
    return {
        ...o,
        instruments: [...o.instruments],
        mute: [...o.mute],
        tracks: [...o.tracks],
        volume: o.volume ? [...o.volume] : null,
        trackOctaveShift: o.trackOctaveShift ? [...o.trackOctaveShift] : null,
        trackInstrumentNames: o.trackInstrumentNames ? [...o.trackInstrumentNames] : null,
        noteColors: [...o.noteColors],
    };
}
const local = reactive(cloneOpts(props.options));
const loopExpanded = ref(false);
watch(() => props.visible, (v) => {
    if (v) {
        Object.assign(local, cloneOpts(props.options));
        loopExpanded.value = false;
    }
});
/** Emit an apply event whenever the user changes a switch/value. */
function applyNow() {
    emit('apply', cloneOpts(local));
}
/** Last measure number (0-based) — used to clamp loop end. */
const lastMeasure = () => props.lastMeasure ?? (props.options.lastMeasure ?? 0);
/** Loop measure increment/decrement helpers */
function decrementLoopStart() {
    local.playMeasuresInLoopStart = Math.max(0, local.playMeasuresInLoopStart - 1);
    applyNow();
}
function incrementLoopStart() {
    local.playMeasuresInLoopStart = Math.min(local.playMeasuresInLoopEnd, local.playMeasuresInLoopStart + 1);
    applyNow();
}
function decrementLoopEnd() {
    local.playMeasuresInLoopEnd = Math.max(local.playMeasuresInLoopStart, local.playMeasuresInLoopEnd - 1);
    applyNow();
}
function incrementLoopEnd() {
    local.playMeasuresInLoopEnd = Math.min(lastMeasure(), local.playMeasuresInLoopEnd + 1);
    applyNow();
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
/** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
/** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
/** @type {__VLS_StyleScopedClasses['on']} */ ;
/** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
/** @type {__VLS_StyleScopedClasses['loop-arrow-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['loop-subitem-row']} */ ;
/** @type {__VLS_StyleScopedClasses['loop-badge-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-action-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-action-btn']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "fade",
}));
const __VLS_2 = __VLS_1({
    name: "fade",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.$emit('close');
                // @ts-ignore
                [visible, $emit,];
            } },
        ...{ class: "drawer-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['drawer-backdrop']} */ ;
}
// @ts-ignore
[];
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    name: "slide-left",
}));
const __VLS_8 = __VLS_7({
    name: "slide-left",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
const { default: __VLS_11 } = __VLS_9.slots;
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "drawer" },
        role: "dialog",
        'aria-modal': "true",
        'aria-label': "Settings",
    });
    /** @type {__VLS_StyleScopedClasses['drawer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "drawer-header" },
    });
    /** @type {__VLS_StyleScopedClasses['drawer-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "drawer-title" },
    });
    /** @type {__VLS_StyleScopedClasses['drawer-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "drawer-body" },
    });
    /** @type {__VLS_StyleScopedClasses['drawer-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.scrollVert);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.scrollVert }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.useColors);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.useColors }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.colorAccidentals);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.colorAccidentals }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "loop-header-row" },
    });
    /** @type {__VLS_StyleScopedClasses['loop-header-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row loop-switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['loop-switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.playMeasuresInLoop);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.playMeasuresInLoop }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.loopExpanded = !__VLS_ctx.loopExpanded;
                // @ts-ignore
                [visible, applyNow, applyNow, applyNow, applyNow, local, local, local, local, local, local, local, local, loopExpanded, loopExpanded,];
            } },
        ...{ class: "loop-arrow-btn" },
        ...{ class: ({ expanded: __VLS_ctx.loopExpanded }) },
        'aria-label': "Expand loop settings",
    });
    /** @type {__VLS_StyleScopedClasses['loop-arrow-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['expanded']} */ ;
    if (__VLS_ctx.loopExpanded) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loop-subitems" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-subitems']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loop-subitem-row" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-subitem-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loop-subitem-label" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-subitem-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loop-badge-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.decrementLoopStart) },
            ...{ class: "loop-badge-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loop-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge']} */ ;
        (__VLS_ctx.local.playMeasuresInLoopStart + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.incrementLoopStart) },
            ...{ class: "loop-badge-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loop-subitem-row" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-subitem-row']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loop-subitem-label" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-subitem-label']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "loop-badge-controls" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-controls']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.decrementLoopEnd) },
            ...{ class: "loop-badge-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "loop-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge']} */ ;
        (__VLS_ctx.local.playMeasuresInLoopEnd + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.incrementLoopEnd) },
            ...{ class: "loop-badge-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['loop-badge-btn']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.showMeasures);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.showMeasures }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "switch-row" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.applyNow) },
        type: "checkbox",
        ...{ class: "switch-input" },
    });
    (__VLS_ctx.local.showBeatMarkers);
    /** @type {__VLS_StyleScopedClasses['switch-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "switch-track" },
        ...{ class: ({ on: __VLS_ctx.local.showBeatMarkers }) },
    });
    /** @type {__VLS_StyleScopedClasses['switch-track']} */ ;
    /** @type {__VLS_StyleScopedClasses['on']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "switch-thumb" },
    });
    /** @type {__VLS_StyleScopedClasses['switch-thumb']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "divider" },
    });
    /** @type {__VLS_StyleScopedClasses['divider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.$emit('openFullSettings');
                // @ts-ignore
                [$emit, applyNow, applyNow, local, local, local, local, local, local, loopExpanded, loopExpanded, decrementLoopStart, incrementLoopStart, decrementLoopEnd, incrementLoopEnd,];
            } },
        ...{ class: "drawer-action-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['drawer-action-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "drawer-action-btn" },
        disabled: true,
        title: "Not available in web version",
    });
    /** @type {__VLS_StyleScopedClasses['drawer-action-btn']} */ ;
}
// @ts-ignore
[];
var __VLS_9;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

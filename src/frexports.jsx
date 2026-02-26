import { createContext, useContext } from "react";

import {
    AbilityNode,
    APLStartNode,
    APLEndNode,
    ConditionalGateNode,
    ConditionalBuffNode,
    ConditionalCooldownNode,
    PreCombatNode,
    CustomListNode,
    CustomListReferenceNode,
    VariableNode,
    VariableReferenceNode
} from './nodes';

export const DnDContext = createContext([null, () => {}]);
export const useDnD = () => {
    return useContext(DnDContext);
}
let id = 0;
export const getId = () => `dndnode_${id++}`;

export const excludeTypes = [
    'conditional-cooldown',
    'ability',
    'conditional-buff',
    'conditional-gate',
    'apl-end',
    'customlist-ref',
    'variable',
    'variable-ref'
];

export const nodeTypes = {
    default: CustomListNode,
    'precombat': PreCombatNode,
    'apl-start': APLStartNode,
    'apl-end': APLEndNode,
    'ability': AbilityNode,
    'conditional-gate': ConditionalGateNode,
    'conditional-cooldown': ConditionalCooldownNode,
    'conditional-buff': ConditionalBuffNode,
    'customlist-ref': CustomListReferenceNode,
    'variable': VariableNode,
    'variable-ref': VariableReferenceNode,
};
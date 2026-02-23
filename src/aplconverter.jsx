import { nodeTypes } from './App.jsx';


function buildConditionString(nodeData) {
    const node = nodeData.data;
    if (!node.types) return '';

    const abilityName = node.abilityName.replaceAll(' ', '_');
    if (node.types.includes('cooldown')) {
        return `cooldown.${abilityName}.ready`;
    }
    if (node.types.includes('buff')) {
        return `buff.${abilityName}.up`;
    }
    return '';
}

export function constructConditionalString(prevNode, currentNode, nodeData, edges) {
    if (!(currentNode in edges) || !edges[currentNode]?.length) return '';
    var cond = '';
    const operator = nodeData[currentNode].data.operator;
    const isNot = operator === 'not';
    let operatorSymbol = operator === 'and' ? '&' : operator === 'or' ? '|' : '';
    if (nodeData[currentNode].type.includes('gate')) {
        if (prevNode !== null && nodeData[prevNode].type.includes('cond') && nodeData[prevNode].data.operator !== "not" && !isNot) cond += '&';
        if (isNot) cond += '!';
        let top = edges[currentNode][0];
        let bottom = edges[currentNode][1];

        if (prevNode !== null && (nodeData[prevNode].type.includes('cond'))) cond += '(';
        if (top && nodeData[top]?.type.includes('cond')) {
            cond += buildConditionString(nodeData[top]);
            cond += constructConditionalString(currentNode, top, nodeData, edges);
        }
        if (bottom && nodeData[bottom]?.type.includes('cond')) {
            cond += operatorSymbol;
            cond += buildConditionString(nodeData[bottom]);
            cond += constructConditionalString(currentNode, bottom, nodeData, edges);
            if (prevNode !== null && (nodeData[prevNode].type.includes('cond') && nodeData[prevNode].data.operator !== "not" && !isNot)) cond += ')';
        }
        if (!bottom) cond += ')';
    }
    if (nodeData[currentNode].type.includes('gate')) return cond;
    for (var i = 0; i < edges[currentNode].length; i++) {
        var target = edges[currentNode][i];
        if (!nodeData[target]?.type.includes('cond')) continue;
        if (prevNode !== null && !nodeData[target].type.includes('gate')) cond += '&';
        cond += buildConditionString(nodeData[target]);
        cond += constructConditionalString(currentNode, target, nodeData, edges);


    }

    return cond;
}

function buildAPL(data, edges, listName = '') {
    var apl = '';
    var abilityList = listName !== '' ? `actions.${listName}` : 'actions';
    var idx = 0;
    for (const edge in edges) {
        for (var i = 0; i < edges[edge].length; i++) {
            var target = edges[edge][i];
            if (data[edge].type === listName) {
                if (data[target]?.type.includes('clist-reference')) {
                    apl += addListReference(abilityList, data, edges, target, idx);
                }
                else if (data[target]?.type === 'variable') {
                    apl += addVariable(abilityList, data, edges, target, idx);
                }
                else if (data[target]?.type === 'ability') {
                    apl += addAbility(abilityList, data, edges, target, idx);
                }
            } else if (data[target]?.type.includes('clist-reference')) {
                apl += addListReference(abilityList, data, edges, target, idx);
            } else if (data[target]?.type === 'variable') {
                apl += addVariable(abilityList, data, edges, target, idx);
            } else if (data[target]?.type === 'ability') {
                apl += addAbility(abilityList, data, edges, target, idx);
            }
        }
        idx++;

    }
    if (apl === '') return '';
    apl += '\n\n';
    return apl;
}

function addEdge(dict, flow, data, idx) {
    if (flow.edges[idx].source in data) {
        if (!dict[flow.edges[idx].source]) {
            dict[flow.edges[idx].source] = [];
        }
        dict[flow.edges[idx].source].push(flow.edges[idx].target);
    }
}

function addAbility(abilityList, data, edges, target, idx) {
    var apl = '';
    if (idx === 0) {
        apl = `${abilityList}=${data[target].data.abilityName.replaceAll(' ', '_')}`;
    }
    else {
        apl = `${abilityList}+=/${data[target].data.abilityName.replaceAll(' ', '_')}`;
    }
    if (data[target].data.hasConditionals === true) {
        apl += `,if=`;
        apl += `${constructConditionalString(null, target, data, edges)}`;
    }
    return `${apl}\n`;
}

function addListReference(abilityList, data, edges, target, idx) {
    var apl = '';
    var action = data[target].data.hasConditionals ?  'run_action_list' : 'call_action_list';

    if (idx === 0) {
        apl = `${abilityList}=${action},name=${data[target].data.value.replaceAll(' ', '_')}`;
    }
    else {
        apl = `${abilityList}+=/${action},name=${data[target].data.value.replaceAll(' ', '_')}`;
    }
    if (data[target].data.hasConditionals === true) {
        apl += `,if=`;
        apl += `${constructConditionalString(null, target, data, edges)}`;
    }
    return `${apl}\n`;
};

function addVariable(abilityList, data, edges, target, idx) {
    var apl = '';
    if (idx === 0) {
        apl = `${abilityList}=variable,name=${data[target].data.value.replaceAll(' ', '_')}`;
    }
    else {
        apl = `${abilityList}+=/variable,name=${data[target].data.value.replaceAll(' ', '_')}`;
    }
    apl += `,value=${constructConditionalString(null, target, data, edges)}`;
    return `${apl}\n`;
}

export function convertToAPL(flow) {
    var apl = ""
    var precombat_data = {};
    var apl_start_data = {};
    var custom_list_data = {};

    for (var i = 0; i < flow.nodes.length; i++) {
        const nodeData = {
            'type': flow.nodes[i].type,
            'data': Object.fromEntries(Object.entries(flow.nodes[i].data).map(([key, value]) => {
                if (typeof value === 'string') {
                    return [key, value.toLowerCase()];
                }
                return [key, value];
            }))
        };
        console.log(nodeData);
        if (flow.nodes[i].data.initNode === 'precombat' || flow.nodes[i].type === 'precombat') {
            precombat_data[flow.nodes[i].id] = nodeData;
        } else if (flow.nodes[i].data.initNode === 'apl-start' || flow.nodes[i].type === 'apl-start') {
            apl_start_data[flow.nodes[i].id] = nodeData;
        }
        else {
            if (!(flow.nodes[i].data.initNode in nodeTypes) && !(flow.nodes[i].type in nodeTypes)) {
                if (!(flow.nodes[i].type in custom_list_data)) {
                    custom_list_data[flow.nodes[i].type] = {};
                }
                custom_list_data[flow.nodes[i].type][flow.nodes[i].id] = nodeData;
            }
            if (flow.nodes[i].data.initNode in custom_list_data) {
                custom_list_data[flow.nodes[i].data.initNode][flow.nodes[i].id] = nodeData;
            }
        }
    }

    var pcedges = {};
    var aplstartedges = {};
    var customedges = {};

    for (i = 0; i < flow.edges.length; i++) {
        if (flow.edges[i].source in precombat_data) {
            addEdge(pcedges, flow, precombat_data, i);
        } else if (flow.edges[i].source in apl_start_data) {
            addEdge(aplstartedges, flow, apl_start_data, i);
        } else {
            for (const clist in custom_list_data) {
                if (flow.edges[i].source in custom_list_data[clist]) {
                    if (!(clist in customedges)) {
                        customedges[clist] = {};
                    }
                    addEdge(customedges[clist], flow, custom_list_data[clist], i);
                }
            }
            if (flow.edges[i].source in custom_list_data) { continue; }
        }
    }
    apl += buildAPL(precombat_data, pcedges, 'precombat');
    apl += buildAPL(apl_start_data, aplstartedges);
    for (const clist in custom_list_data) {
        apl += buildAPL(custom_list_data[clist], customedges[clist], clist);
    }

    return apl;
}
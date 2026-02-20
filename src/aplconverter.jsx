
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
    for (const edge in edges) {
        var j = 0;
        for (var i = 0; i < edges[edge].length; i++) {
            var target = edges[edge][i];
            if (data[edge].type === listName) {
                if (data[target].type === 'ability') {
                    apl += addAbility(abilityList, data, edges, target);
                }
            } else if (data[target].type === 'ability') {
                apl += addAbility(abilityList, data, edges, target);
            }
        }
        j++;
    }
    if (apl === '') return '';
    apl += '\n\n';
    return apl;
}


function insertData(dict, flow, types, idx) {
    if (!types.includes(flow.nodes[idx].type) || (!(flow.nodes[idx].source in dict) && !types.includes(flow.nodes[idx].type))) return;
    dict[flow.nodes[idx].id] = {
        'type': flow.nodes[idx].type,
        'data': Object.fromEntries(Object.entries(flow.nodes[idx].data).map(([key, value]) => {
            if (typeof value === 'string') {
                return [key, value.toLowerCase()]; ''
            }
            return [key, value];
        }))
    };
}

function addEdge(dict, flow, data, idx) {
    if (flow.edges[idx].source in data) {
        if (!dict[flow.edges[idx].source]) {
            dict[flow.edges[idx].source] = [];
        }
        dict[flow.edges[idx].source].push(flow.edges[idx].target);
    }
}

function addAbility(abilityList, data, edges, target) {
    var apl = `${abilityList}+=/${data[target].data.abilityName.replaceAll(' ', '_')}`;
    if (data[target].data.hasConditionals === true) {
        apl += `,if=`;
        apl += `${constructConditionalString(null, target, data, edges)}`;
    }
    return `${apl}\n`;
}

export function convertToAPL(flow) {
    var apl = ""
    var precombat_data = {};
    var relevant_data = {};
    const dataTypes = ['apl-start', 'ability', 'conditional-ability', 'conditional-cooldown', 'conditional-buff', 'conditional-gate'];
    for (var i = 0; i < flow.nodes.length; i++) {
        insertData(precombat_data, flow, ['precombat', 'ability', 'conditional-ability', 'conditional-cooldown', 'conditional-buff', 'conditional-gate'], i);
        insertData(relevant_data, flow, dataTypes, i);
    }
    var edges = {};
    var pcedges = {};
    for (var i = 0; i < flow.edges.length; i++) {
        if (flow.edges[i].source in precombat_data) {
            addEdge(pcedges, flow, precombat_data, i)
        } else {
            addEdge(edges, flow, relevant_data, i);
        }
    }
    apl += buildAPL(precombat_data, pcedges, 'precombat');
    apl += buildAPL(relevant_data, edges);

    return apl;
}
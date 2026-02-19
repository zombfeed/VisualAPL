
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
  
        if (prevNode !== null && (nodeData[prevNode].type.includes('cond') )) cond += '(';
        if (top && nodeData[top]?.type.includes('cond')) {
            cond += buildConditionString(nodeData[top]);
            cond += constructConditionalString(currentNode, top, nodeData, edges);
        }
        if (bottom && nodeData[bottom]?.type.includes('cond')) {
            cond += operatorSymbol;
            cond += buildConditionString(nodeData[bottom]);
            cond += constructConditionalString(currentNode, bottom, nodeData, edges);
            if (prevNode !== null && (nodeData[prevNode].type.includes('cond')  && nodeData[prevNode].data.operator !== "not" && !isNot)) cond += ')';
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

export function convertToAPL(flow) {
    var apl = ""
    var abilityList = "actions";

    var relevant_data = {}
    for (var i = 0; i < flow.nodes.length; i++) {
        relevant_data[flow.nodes[i].id] = {
            'type': flow.nodes[i].type,
            'data': Object.fromEntries(Object.entries(flow.nodes[i].data).map(([key, value]) => {
                if (typeof value === 'string') {
                    return [key, value.toLowerCase()]; ''
                }
                return [key, value];
            }))
        };
    }

    var edges = {}
    for (var i = 0; i < flow.edges.length; i++) {
        if (!edges[flow.edges[i].source]) {
            edges[flow.edges[i].source] = [];
        }
        edges[flow.edges[i].source].push(flow.edges[i].target);
    }


    for (const edge in edges) {
        var j = 0;
        for (var i = 0; i < edges[edge].length; i++) {
            var target = edges[edge][i];
            if (relevant_data[edge].type === 'apl-start') {
                if (relevant_data[target].type === 'ability') {
                    apl += `${abilityList}=${relevant_data[target].data.abilityName.replaceAll(' ', '_')}`;
                    if (relevant_data[target].data.hasConditionals === true) {
                        apl += `,if=`;
                        apl += `${constructConditionalString(null, target, relevant_data, edges)}`;
                    }
                }
            } else if (relevant_data[target].type === 'ability') {
                apl += `\n${abilityList}+=/${relevant_data[target].data.abilityName.replaceAll(' ', '_')}`;
                if (relevant_data[target].data.hasConditionals === true) {
                    apl += `,if=`;
                    apl += `${constructConditionalString(null, target, relevant_data, edges)}`;
                }
            } else if (relevant_data[target].type === 'apl-end') {
                abilityList = `\nactions${j}`;
            }
        }
        j++;
    }
    return apl;
}
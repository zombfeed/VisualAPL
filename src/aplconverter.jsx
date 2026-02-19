
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

function constructConditionalString(currentNode, nodeData, edges) {
    if (!(currentNode in edges) || !edges[currentNode]?.length) return '';
    let cond = '';
    console.log(nodeData[currentNode]);
    if (!nodeData[currentNode].type.includes('gate') && nodeData[currentNode].type.includes('cond')) {
        const nextNode = edges[currentNode];
        console.log(nodeData[nextNode]);
        cond += '&';
        cond += buildConditionString(nodeData[nextNode]);
    }
    const operator = nodeData[currentNode].data.operator;
    const isNot = operator === 'not';
    const operatorSymbol = operator === 'and' ? '&' : operator === 'or' ? '|' : '';

    if (isNot) cond += '!';
    
    const firstNode = edges[currentNode][0];
    if (firstNode && nodeData[firstNode]?.type.includes('cond') && nodeData[currentNode].type.includes('gate')) {
        cond += '(';
        cond += buildConditionString(nodeData[firstNode]);
    }
    cond += constructConditionalString(firstNode, nodeData, edges);

    if (!isNot && edges[currentNode][1]) {
        cond += operatorSymbol;
        const secondNode = edges[currentNode][1];
        if (nodeData[secondNode]?.type.includes('cond')) {
            cond += buildConditionString(nodeData[secondNode]);
        }
        cond += constructConditionalString(secondNode, nodeData, edges);
        cond += ')';
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
                        apl += `${constructConditionalString(target, relevant_data, edges)}`;
                    }
                }
            } else if (relevant_data[target].type === 'ability') {
                apl += `\n${abilityList}+=/${relevant_data[target].data.abilityName.replaceAll(' ', '_')}`;
                if (relevant_data[target].data.hasConditionals === true) {
                    apl += `,if=`;
                    apl += `${constructConditionalString(target, relevant_data, edges)}`;
                }
            } else if (relevant_data[target].type === 'apl-end') {
                abilityList = `\nactions${j}`;
            }
        }
        j++;
    }
    console.log(apl);
    return apl;
}
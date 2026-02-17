import React, { useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Background,
  Panel,
  getIncomers,
  getOutgoers,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { AbilityNode, APLStartNode, APLEndNode, ConditionalAbilityNode, ConditionalAndNode, ConditionalOrNode } from './nodes';

import Sidebar from './Sidebar';
import { DnDProvider, useDnD } from './DnDContext';

const MIN_DISTANCE = 150;

const APLKey = 'apl-flow';
const nodeTypes = {
  ability: AbilityNode,
  'apl-start': APLStartNode,
  'apl-end': APLEndNode,
  'conditional-ability': ConditionalAbilityNode,
  'conditional-or': ConditionalOrNode,
  'conditional-and': ConditionalAndNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

function constructConditionalString(currentNode, nodeData, edges) {
  var cond = '';
  if (!(currentNode in edges)) return cond;
  for (var i = 0; i < edges[currentNode].length; i++) {
    var target = edges[currentNode][i];
    if (!nodeData[target].type.includes('cond')) {
      continue;
    }
    if (nodeData[target].type === 'conditional-ability') {
      if (nodeData[target].data.types && nodeData[target].data.types.includes('cooldown')) {
        cond += `${nodeData[target].data.abilityName.replaceAll(' ', '_')}.ready`;
      } else if (nodeData[target].data.types && nodeData[target].data.types.includes('buff')) {
        cond += `${nodeData[target].data.abilityName.replaceAll(' ', '_')}.up`;
      }
    } else if (nodeData[target].type == 'conditional-or') {
      cond += `|`;
    } else if (nodeData[target].type == 'conditional-and') {
      cond += `&`;
    }
    return cond += constructConditionalString(target, nodeData, edges);
  }
  return cond;

}

function convertToAPL(flow) {
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
            apl += constructConditionalString(target, relevant_data, edges);
          }
        }
      } else if (relevant_data[target].type === 'ability') {
        apl += `\n${abilityList}+=/${relevant_data[target].data.abilityName.replaceAll(' ', '_')}`;
        if (relevant_data[target].data.hasConditionals === true) {
          apl += `,if=`;
          apl += constructConditionalString(target, relevant_data, edges);
        }
      } else if (relevant_data[target].type === 'apl-end') {
        abilityList = `\nactions${j}`;
      }
    }
    j++;
  }
  return apl;
}


function DnDFlow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [APLInstance, setAPLInstance] = React.useState(null);
  const [type, setType] = useDnD();
  const edgeReconnectSuccessful = useRef(true);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
  });

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type],
  );

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onSave = useCallback(() => {
    if (APLInstance) {
      const flow = APLInstance.toObject();

      const prunedNodes = (nodes || []).map((n) => {
        const data = {};
        if (n.type === 'apl-start') {
          data.className = n.data?.className;
          data.specName = n.data?.specName;
        } else if (n.type === 'ability') {
          data.abilityName = n.data?.abilityName;
          data.conditional = n.data?.hasConditionals;
          data.types = n.data?.types;
        } else if (n.type === 'conditional-ability') {
          data.abilityName = n.data?.abilityName;
          data.types = n.data?.types;
        }
        return { ...n, data };
      });

      const fullFlow = { ...flow, nodes: prunedNodes, edges: edges || [] };
      const json = JSON.stringify(fullFlow, null, 2);
      const aplfile = convertToAPL(flow);
      localStorage.setItem(APLKey, aplfile);

      const blob = new Blob([aplfile], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `apl-flow-${now}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }, [APLInstance, nodes, edges]);

  const onNodesDelete = useCallback((deleted) => {
    if (!deleted || deleted.length === 0) return;

    setEdges((eds) => {
      let nextEdges = eds.filter((e) => !deleted.some((n) => n.id === e.source || n.id === e.target));

      deleted.forEach((node) => {
        const incomers = getIncomers(node, nodes, eds);
        const outgoers = getOutgoers(node, nodes, eds);

        incomers.forEach((inc) => {
          outgoers.forEach((out) => {
            if (inc.id === out.id) return;
            const exists = nextEdges.find((e) => e.source === inc.id && e.target === out.id);
            if (!exists) {
              nextEdges = nextEdges.concat({ id: `e_${inc.id}_${out.id}`, source: inc.id, target: out.id });
            }
          });
        });
      });

      return nextEdges;
    });

    setNodes((nds) => nds.filter((n) => !deleted.some((d) => d.id === n.id)));
  }, [nodes, setNodes, setEdges]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const allNodes = APLInstance?.getNodes ? APLInstance.getNodes() : nodes;
      const selected = (allNodes || []).filter((n) => n.selected);
      if (selected && selected.length) {
        onNodesDelete(selected);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [APLInstance, onNodesDelete, nodes]);

  return (
    <div className="dndflow">
      <Sidebar />
      <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          onConnect={onConnect}
          onDrop={onDrop}
          onInit={setAPLInstance}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <Panel position="top-right">
            <button className="xy-theme__button" onClick={onSave}>save</button>
          </Panel>
        </ReactFlow>
      </div>

    </div>
  );
};

function FlowWithProvider() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow />
      </DnDProvider>
    </ReactFlowProvider>
  );
}

export default FlowWithProvider;
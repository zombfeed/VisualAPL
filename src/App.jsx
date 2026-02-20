import React, { useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
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

import { AbilityNode, APLStartNode, APLEndNode, ConditionalGateNode, ConditionalBuffNode, ConditionalCooldownNode, PreCombatNode } from './nodes';

import Sidebar from './Sidebar';
import { DnDProvider, useDnD } from './DnDContext';
import { convertToAPL } from './aplconverter';

const MIN_DISTANCE = 150;

const APLKey = 'apl-flow';
const nodeTypes = {
  ability: AbilityNode,
  'apl-start': APLStartNode,
  'apl-end': APLEndNode,
  'conditional-gate': ConditionalGateNode,
  'conditional-cooldown': ConditionalCooldownNode,
  'conditional-buff': ConditionalBuffNode,
  'precombat': PreCombatNode,
};

let id = 0;
export const getId = () => `dndnode_${id++}`;

const initialNodes = [
  {
    id: getId(),
    type: 'apl-start',
    data: { label: 'APL Start Node' },
    position: { x: 250, y: 5 },
  },
  // {
  //   id: getId(),
  //   type: 'ability',
  //   data: { label: 'Ability Node', abilityName: 'vanish', hasConditionals: true, types: ['cooldown'] },
  //   position: { x: 250, y: 200 },
  // },
  // {
  //   id: getId(),
  //   type: 'conditional-gate',
  //   data: { label: 'Conditional Gate Node', operator:'AND' },
  //   position: { x: 250, y: 400 },
  // },
  // {
  //   id: getId(),
  //   type: 'conditional-cooldown',
  //   data: { label: 'Conditional Cooldown Node', abilityName: 'vanish',  types: ['cooldown'], },
  //   position: { x: 100, y: 600 },
  // },
  // {
  //   id: getId(),
  //   type: 'conditional-cooldown',
  //   data: { label: 'Conditional Cooldown Node', abilityName: 'vanish',  types: ['cooldown'] },
  //   position: { x: 400, y: 600 },
  // }
];

const initialEdges = [
  // {
  //   id: getId(),
  //   source: initialNodes[0].id,
  //   sourceHandle: 'bottom-source-handle',
  //   target: initialNodes[1].id,
  //   targetHandle: 'top-target-handle',
  // },
  // {
  //   id: getId(),
  //   source: initialNodes[1].id,
  //   sourceHandle: 'cond-right-source-handle',
  //   target: initialNodes[2].id,
  //   targetHandle: 'cond-left-target-handle',
  // },
  // {
  //   id: getId(),
  //   source: initialNodes[2].id,
  //   sourceHandle: `cond-right-source-handle-1`,
  //   target: initialNodes[3].id,
  //   targetHandle: 'cond-left-target-handle',
  // },
  // {
  //   id: getId(),
  //   source: initialNodes[2].id,
  //   sourceHandle: 'cond-right-source-handle-2',
  //   target: initialNodes[4].id,
  //   targetHandle: 'cond-left-target-handle',
  // },
];

const connectionValidation = (connection) =>{
  if (connection.sourceHandle.includes('bottom-source-handle') && connection.targetHandle.includes('top-target-handle')) {
    return true;
  } else if (connection.sourceHandle.includes('cond-right-source-handle') && (connection.targetHandle.includes('cond-left-target-handle'))) {
    return true;
  }
  return false;
}

function DnDFlow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [APLInstance, setAPLInstance] = React.useState(null);
  const [type, setType] = useDnD();
  const edgeReconnectSuccessful = useRef(true);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const onConnectEnd = useCallback((event, connectionState) => {
    if (!connectionState.isValid) {
      const id = getId();
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      var newNode = {};
      if (connectionState.fromHandle.id.includes('bottom-source-handle')) {
        newNode = {
          id,
          type: 'ability',
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: { label: 'Ability', abilityName: 'Ability', hasConditionals: false, types: [] },
        };
      }
      else {
        return;
      }
      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) => eds.concat({ id, source: connectionState.fromNode.id, sourceHandle: connectionState.fromHandle.id, target: id }));
    }
  }, [screenToFlowPosition]);

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
        } else if (n.type === 'conditional-cooldown' || n.type === 'conditional-buff') {
          data.abilityName = n.data?.abilityName;
          data.types = n.data?.types;
        } else if (n.type === 'conditional-gate') {
          data.operator = n.data?.operator;
        } else if (n.type === 'precombat') {
          data.precombat = n.data?.precombat;
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
      if (event.key !== 'Delete') return;
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
          deleteKeyCode={['Delete']}
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
          onConnectEnd={onConnectEnd}
          onDrop={onDrop}
          onInit={setAPLInstance}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          isValidConnection={connectionValidation}
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
import { Position, Handle, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect, useState, useCallback } from 'react';
import abilitiesJson from '../public/SpellIcons/abilities.json';
import LimitHandle from './handles';
import { getId, excludeTypes } from './frexports';

const iconURL = '/VisualAPL/SpellIcons';

function FindInitialNode({ id }) {
    const { getNodes, getEdges } = useReactFlow();
    const nodesAll = typeof getNodes === 'function' ? getNodes() : [];
    const edgesAll = typeof getEdges === 'function' ? getEdges() : [];

    const nodeById = {};
    nodesAll.forEach(n => { nodeById[n.id] = n; });

    const parentsMap = {};
    edgesAll.forEach(e => {
        if (!parentsMap[e.target]) parentsMap[e.target] = [];
        parentsMap[e.target].push(e.source);
    });

    const findUpstreamStart = (startId) => {
        const visited = new Set();
        const queue = [startId];
        while (queue.length) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);
            const node = nodeById[current];
            if (node && !excludeTypes.includes(node.type)) return node.type;
            const parents = parentsMap[current] || [];
            for (const p of parents) {
                if (!visited.has(p)) queue.push(p);
            }
        }
        return null;
    };

    const startNode = findUpstreamStart(id);
    return startNode;
}


export function AbilityNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const [imagesJson, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(data?.imageUrl || '');
    const [selectedName, setSelectedName] = useState(data?.abilityName || '');
    const [selectedTypes, setSelectedTypes] = useState(data?.types || '');
    const updateNodeInternals = useUpdateNodeInternals();

    const toggleHandles = (event) => {
        const checked = event.target.checked;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, hasConditionals: checked };
                    return { ...node, data: newData };
                }
                return node;
            })
        );
        updateNodeInternals(id);
    };

    useEffect(() => {
        try {
            setImages(Array.isArray(abilitiesJson) ? abilitiesJson : []);
        } catch (e) {
            console.log('Error loading abilities.json:', e);
            setImages([]);
        }
    }, []);

    const handleChange = (event) => {
        try {
            const parsed = JSON.parse(event.target.value || '{}');
            setSelectedImage(parsed.url || '');
            setSelectedName(parsed.name || '');
            setSelectedTypes(parsed.types || '');
        } catch {
            setSelectedImage(event.target.value || '');
            setSelectedName('');
        }
        updateNodeInternals(id);
    };


    const initNode = FindInitialNode({ id, data });
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, abilityName: selectedName, types: selectedTypes, initNode: initNode, type: 'ability' };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [selectedImage, selectedName, selectedTypes, id, setNodes, initNode]);

    const className = document.getElementById('class-select')?.value || '';
    const specName = document.getElementById('spec-select')?.value || '';
    const heroName = document.getElementById('hero-select')?.value || '';

    let options = [];
    if (Array.isArray(imagesJson) && imagesJson.length && className && specName && heroName) {
        for (const entry of imagesJson) {
            if (entry[className]) {
                options = entry[className].Abilities.map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                });
            }
            if (entry[className][specName]) {
                options.push(...entry[className][specName].map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                }));
            }
            if (entry[className].HeroTalents[heroName]) {
                options.push(...entry[className].HeroTalents[heroName].map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                }));
                break;
            }
        }
    }

    if (!options.length) {
        options = data?.options || [];
    }
    const selectedValue = (selectedImage && selectedName) ? JSON.stringify({ url: selectedImage, name: selectedName, types: selectedTypes }) : '';

    return (
        <div className="ability-node">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <select onChange={handleChange} value={selectedValue} style={{ minWidth: 160 }}>
                    <option value="">-- select ability --</option>
                    {options.map((opt) => {
                        if (!opt.types.includes("damage") && !opt.types.includes("cooldown")) {
                            return;
                        }
                        const value = JSON.stringify({ url: opt.url, name: opt.name, types: opt.types });
                        return (
                            <option key={opt.id ?? opt.name} value={value}>{opt.name}</option>
                        );
                    })}
                </select>
                {selectedImage && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <img src={selectedImage} alt={selectedName || 'Selected'} style={{ display: 'block', marginTop: '5px', maxWidth: 64, width: '100px' }} />
                        <div className='conditional-checkbox' style={{ display: 'block', width: '100px' }}>
                            <label>
                                <input type="checkbox" onChange={toggleHandles} checked={data.hasConditionals || false} />
                                <span>Conditions</span>
                            </label>
                        </div>
                        <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" style={{ top: '50%' }} className={!data.hasConditionals ? 'handle-hidden' : ''} />
                    </div>
                )}
            </div>
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
            <LimitHandle type="target" position={Position.Top} id="top-target-handle" />
        </div>
    );
}

function CondionalNodeSetup({ id, data }, setNodes, imagesJson) {
    const [selectedImage, setSelectedImage] = useState(data?.imageUrl || '');
    const [selectedName, setSelectedName] = useState(data?.abilityName || '');
    const [selectedTypes, setSelectedTypes] = useState(data?.types || '');
    const updateNodeInternals = useUpdateNodeInternals();
    const initNode = FindInitialNode({ id, data });

    const toggleReady = (event) => {
        const checked = event.target.checked;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, isReady: checked }
                    return { ...node, data: newData };
                }
                return node;
            })
        );
        updateNodeInternals(id);
    };

    const handleChange = (event) => {
        try {
            const parsed = JSON.parse(event.target.value || '{}');
            setSelectedImage(parsed.url || '');
            setSelectedName(parsed.name || '');
            setSelectedTypes(parsed.types || '');
        } catch {
            setSelectedImage(event.target.value || '');
            setSelectedName('');
        }
        updateNodeInternals(id);
    };

    const className = document.getElementById('class-select')?.value || '';
    const specName = document.getElementById('spec-select')?.value || '';
    const heroName = document.getElementById('hero-select')?.value || '';

    let options = [];
    if (Array.isArray(imagesJson) && imagesJson.length && className && specName && heroName) {
        for (const entry of imagesJson) {
            if (entry[className]) {
                options = entry[className].Abilities.map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                });
            }
            if (entry[className][specName]) {
                options.push(...entry[className][specName].map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                }));
            }
            if (entry[className].HeroTalents[heroName]) {
                options.push(...entry[className].HeroTalents[heroName].map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                }));
                break;
            }
        }
    }

    if (!options.length) {
        options = data?.options || [];
    }

    const selectedValue = (selectedImage && selectedName) ? JSON.stringify({ url: selectedImage, name: selectedName, types: selectedTypes }) : '';

    return [initNode, options, selectedValue, selectedImage, selectedName, selectedTypes, toggleReady, handleChange]
}

function ConditionalNodeHTMLSetup(condType, data, options, selectedName, selectedValue, selectedImage, handleChange, toggleReady) {
    return (
        <div className="ability-node">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <select onChange={handleChange} value={selectedValue} style={{ minWidth: 160 }}>
                    <option value="">-- select ability --</option>
                    {options.map((opt) => {
                        const ctype = condType === "cooldown" ? "cooldown" : "buff";
                        if (!opt.types.includes(ctype)) {
                            return;
                        }
                        const value = JSON.stringify({ url: opt.url, name: opt.name, types: opt.types });
                        return (
                            <option key={opt.id ?? opt.name} value={value}>{opt.name}</option>
                        );
                    })}
                </select>
                {selectedImage && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <img src={selectedImage} alt={selectedName || 'Selected'} style={{ display: 'block', marginTop: '5px', maxWidth: 64 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 14, marginRight: 1
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    {condType === 'cooldown' ? "Cooldown Available" : "Buff Up"}
                                    <input id='conditional-checkbox' type="checkbox" label="cooldown" onChange={toggleReady} checked={data.isReady ?? true} />
                                </div>
                                <input id="rdur" type="number" name="rdur" placeholder="Remaining Duration" style={{ width: 120 }} />
                                <input id="stacks" type="number" name="stacks" placeholder="Stack Count" style={{ width: 120 }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" />
            <LimitHandle type="target" position={Position.Left} id="cond-left-target-handle" />
        </div>
    );
}

export function ConditionalCooldownNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const [imagesJson, setImages] = useState([]);

    const [initNode, options, selectedValue, selectedImage, selectedName, selectedTypes, toggleReady, handleChange] = CondionalNodeSetup({ id, data }, setNodes, imagesJson)


    useEffect(() => {
        try {
            setImages(Array.isArray(abilitiesJson) ? abilitiesJson : []);
        } catch (e) {
            console.log('Error loading abilities.json:', e);
            setImages([]);
        }
    }, []);

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, type: 'conditional-cooldown', abilityName: selectedName, types: selectedTypes, initNode: initNode };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [selectedImage, selectedName, selectedTypes, id, setNodes, initNode]);

    return ConditionalNodeHTMLSetup('cooldown', data, options, selectedName, selectedValue, selectedImage, handleChange, toggleReady);
}

export function ConditionalBuffNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const [imagesJson, setImages] = useState([]);

    const [initNode, options, selectedValue, selectedImage, selectedName, selectedTypes, toggleReady, handleChange] = CondionalNodeSetup({ id, data }, setNodes, imagesJson)


    useEffect(() => {
        try {
            setImages(Array.isArray(abilitiesJson) ? abilitiesJson : []);
        } catch (e) {
            console.log('Error loading abilities.json:', e);
            setImages([]);
        }
    }, []);

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, type: 'conditional-buff', abilityName: selectedName, types: selectedTypes, initNode: initNode };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [selectedImage, selectedName, selectedTypes, id, setNodes, initNode]);


    return  ConditionalNodeHTMLSetup('buff', data, options, selectedName, selectedValue, selectedImage, handleChange, toggleReady);

}

export function ConditionalGateNode({ id, data }) {
    const { setNodes, setEdges } = useReactFlow();
    const initial = data?.operator || 'AND';
    const [operator, setOperator] = useState(initial);
    const updateNodeInternals = useUpdateNodeInternals();
    const initNode = FindInitialNode({ id, data });

    useEffect(() => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, type: 'conditional-gate', operator, initNode } };
            }
            return node;
        }));
        if (operator === 'NOT') {
            setEdges((eds) => eds.filter((e) => {
                return !(e.source === id && e.sourceHandle === `cond-right-source-handle-2`);
            }));
        }
    }, [operator, id, setNodes, setEdges, initNode]);

    const handleChange = (event) => {
        setOperator(event.target.value || 'AND');
        updateNodeInternals(id);
    };

    return (
        <div className="conditional-gate-node">
            <select onChange={handleChange} value={operator} style={{ minWidth: 120 }}>
                <option value="AND">AND Group</option>
                <option value="OR">OR Group</option>
                <option value="NOT">NOT Group</option>
            </select>
            <label style={{ display: 'absolute', alignItems: 'center', top: '5px' }} />
            <LimitHandle type="target" position={Position.Left} id={`cond-left-target-handle`} />
            <LimitHandle
                type="source"
                position={Position.Right}
                style={{ display: 'flex', top: operator === 'NOT' ? '50%' : '25%' }}
                id={`cond-right-source-handle-1`} />

            <LimitHandle type="source" position={Position.Right} style={{ display: 'flex', top: '75%' }} id={`cond-right-source-handle-2`} className={operator === 'NOT' ? 'handle-hidden' : ''} />

        </div>
    );
}

export function APLStartNode() {
    return (
        <div className="apl-start-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            <div>Start</div>
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
        </div>
    );
}

export function PreCombatNode() {
    return (
        <div className="apl-start-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            <div>Pre-Combat</div>
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
        </div>
    );
}

export function APLEndNode() {
    return (
        <div className="apl-end-node">
            End
            <LimitHandle type="target" position={Position.Top} id="top-target-handle" />
        </div>
    );
}

export function CustomListNode({ id, data }) {
    const { setNodes, getNodes } = useReactFlow();
    const onChange = useCallback((evt) => {
        const newValue = evt.target.value;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, type: newValue, data: { ...node.data, value: newValue } };
                }
                return node;
            })
        );
    }, [id, setNodes]);

    const onGenerateNode = useCallback(() => {
        const inputValue = data?.value || 'New Node';
        if (!inputValue.trim()) {
            alert('Please enter a name in the List Name field');
            return;
        }

        const newNodeId = getId();
        const currentNode = getNodes().find(n => n.id === id);

        if (!currentNode) return;

        const newNode = {
            id: newNodeId,
            type: 'customlist-ref',
            data: { label: inputValue, value: inputValue },
            position: {
                x: currentNode.position.x,
                y: currentNode.position.y + 150
            }
        };

        setNodes((nds) => [...nds, newNode]);
    }, [id, data?.value, getNodes, setNodes]);

    return (
        <div className="custom-list-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            Custom List Node
            <input type='text' placeholder='List Name' value={data?.value || ''} onChange={onChange} style={{ width: '100px' }} />
            <button onClick={onGenerateNode} style={{ padding: '2px 6px', fontSize: '12px' }}>Generate Ref</button>
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
        </div>
    )
}

export function CustomListReferenceNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();

    const toggleHandles = (event) => {
        const checked = event.target.checked;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, hasConditionals: checked };
                    return { ...node, data: newData };
                }
                return node;
            })
        );
        updateNodeInternals(id);
    };

    const initNode = FindInitialNode({ id, data });
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, initNode: initNode };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [id, setNodes, initNode]);

    return (
        <div className="custom-list-ref-node" style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8 }}>
            <label style={{ display: 'block', width: '50px', marginRight: 10 }}>{data?.value || 'List Reference'}</label>
            <div className='conditional-checkbox' style={{ display: 'block', width: '100px' }}>
                <label>
                    <input type="checkbox" onChange={toggleHandles} checked={data.hasConditionals || false} />
                    <span>Conditions</span>
                </label>
            </div>
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" style={{ top: '50%' }} className={!data.hasConditionals ? 'handle-hidden' : ''} />
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
            <LimitHandle type="target" position={Position.Top} id="top-target-handle" />
        </div>
    )
}

export function VariableNode({ id, data }) {
    const { setNodes, getNodes } = useReactFlow();
    const initNode = FindInitialNode({ id, data });

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, initNode: initNode };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [id, setNodes, initNode]);

    const onChange = useCallback((evt) => {
        const newValue = evt.target.value;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, value: newValue } };
                }
                return node;
            })
        );
    }, [id, setNodes]);

    const onGenerateNode = useCallback(() => {
        const inputValue = data?.value || 'New Node';
        if (!inputValue.trim()) {
            alert('Please enter a name in the List Name field');
            return;
        }

        const newNodeId = getId();
        const currentNode = getNodes().find(n => n.id === id);

        if (!currentNode) return;

        const newNode = {
            id: newNodeId,
            type: 'variable-ref',
            data: { label: inputValue, value: inputValue },
            position: {
                x: currentNode.position.x,
                y: currentNode.position.y + 150
            }
        };

        setNodes((nds) => [...nds, newNode]);
    }, [id, data?.value, getNodes, setNodes]);


    return (
        <div className="variable-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            Variable
            <input type='text' placeholder='Variable Name' value={data?.value || ''} onChange={onChange} style={{ width: '100px' }} />
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" style={{ top: '50%' }} className={''} />
            <button onClick={onGenerateNode} style={{ padding: '2px 6px', fontSize: '12px' }}>Generate Ref</button>

            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
            <LimitHandle type="target" position={Position.Top} id="top-target-handle" />
        </div>
    )
}

export function VariableReferenceNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const initNode = FindInitialNode({ id, data });
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    const newData = { ...node.data, initNode: initNode };
                    return { ...node, data: newData };
                }
                return node;
            }));
    }, [id, setNodes, initNode]);
    return (
        <div className="variable-ref-node" style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8 }}>
            <label style={{ display: 'block', width: '50px', marginRight: 10 }}>{data?.value || 'Variable Reference'}</label>
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" />
            <LimitHandle type="target" position={Position.Left} id="cond-left-target-handle" />
        </div>
    )
}

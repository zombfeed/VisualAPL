import { Position, Handle, useReactFlow, useUpdateNodeInternals, useNodeConnections } from '@xyflow/react';
import { useEffect, useState } from 'react';
import abilitiesJson from '../public/SpellIcons/abilities.json';
import LimitHandle from './handles.jsx';
const iconURL = '/VisualAPL/SpellIcons';

function findAPLStart({ id, data }) {
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
            if (node && node.type === 'apl-start') return node;
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
    };

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, abilityName: selectedName, types: selectedTypes } };
                }
                return node;
            }));
    }, [selectedImage, selectedName, selectedTypes, id, setNodes]);

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
                        <img src={selectedImage} alt={selectedName || 'Selected'} style={{ display: 'block', marginTop: '5px', maxWidth: 64, width:'100px' }} />
                        <div className='conditional-checkbox' style={{ display: 'block', width:'100px'}}>
                            <label>
                                <input type="checkbox" onChange={toggleHandles} checked={data.hasConditionals || false} />
                                <span>Conditions</span>
                            </label>
                        </div>
                        <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" style={{ top: '50%' }} className={!data.hasConditionals ? 'handle-hidden' : ''}/>
                    </div>
                )}
            </div>
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle"/>
            <LimitHandle type="target" position={Position.Top} id="top-target-handle" />
        </div>
    );
}

export function ConditionalAbilityNode({ id, data }) {
    const { setNodes } = useReactFlow();
    const [imagesJson, setImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(data?.imageUrl || '');
    const [selectedName, setSelectedName] = useState(data?.abilityName || '');
    const [selectedTypes, setSelectedTypes] = useState(data?.types || '');
    const updateNodeInternals = useUpdateNodeInternals();

    //TODO: handle various ability options, such as stack count, remaining duration, etc...


    useEffect(() => {
        try {
            setImages(Array.isArray(abilitiesJson) ? abilitiesJson : []);
        } catch (e) {
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
    };

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, abilityName: selectedName, types: selectedTypes } };
                }
                return node;
            }));
    }, [selectedImage, selectedName, selectedTypes, id, setNodes]);

    const startNode = findAPLStart({ id, data });

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
                        if (opt.types.includes("damage")) {
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 14, marginRight: 1
                             }}>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    Cooldown Available
                                    <input type="checkbox" label="cooldown" onChange={() => { }} checked={true || false}/>
                                </div>
                                <input id="rdur" type="number" name="rdur" placeholder="Remaining Duration" style={{ width: 120 }} />
                                <input id="stacks" type="number" name="stacks" placeholder="Stack Count" style={{ width: 120 }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <LimitHandle type="source" position={Position.Right} id="cond-ability-right-source-handle" />
            <LimitHandle type="target" position={Position.Left} id="cond-ability-left-target-handle" />
        </div>
    );
}

export function ConditionalOrNode() {
    return (
        <div className="conditional-or-node">
            <label style={{ display: 'absolute', alignItems: 'center', top: '5px' }}>COND: OR</label>
            <LimitHandle type="target" position={Position.Left} id="cond-left-target-handle" />
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" />
        </div>
    );
}

export function ConditionalAndNode() {
    return (
        <div className="conditional-and-node">
            <label style={{ display: 'absolute', alignItems: 'center', top: '5px' }}>COND: AND</label>
            <LimitHandle type="target" position={Position.Left} id="cond-left-target-handle" />
            <LimitHandle type="source" position={Position.Right} id="cond-right-source-handle" />
        </div>
    );
}

export function APLStartNode({ id, data }) {


    return (
        <div className="apl-start-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            <div>Start</div>
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
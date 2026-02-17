import { Position, Handle, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
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

    const startNode = findAPLStart({ id, data });

    const className = startNode?.data?.className;
    const specName = startNode?.data?.specName;
    const heroName = startNode?.data?.heroName;

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
                        const value = JSON.stringify({ url: opt.url, name: opt.name, types: opt.types });
                        return (
                            <option key={opt.id ?? opt.name} value={value}>{opt.name}</option>
                        );
                    })}
                </select>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {selectedImage && (
                        <img src={selectedImage} alt={selectedName || 'Selected'} style={{ display: 'block', marginTop: '5px', maxWidth: 64 }} />
                    )}
                    {selectedName && (
                        <div style={{ marginTop: 4, fontSize: 12 }}></div>
                    )}
                    <div className='conditional-checkbox' style={{ position: 'fixed', top: "38%", right: "8px", display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <label style={{ display: 'relative', alignItems: 'center', top: 5 }}>If</label>
                        <input type="checkbox" onChange={toggleHandles} checked={data.hasConditionals || false} />
                    </div>
                    <LimitHandle type="source" position={Position.Right} id="cond-left-source-handle" style={{ top: '50%' }} className={!data.hasConditionals ? 'handle-hidden' : ''} />
                </div>
            </div>
            {/* </div> */}
            <LimitHandle type="source" position={Position.Bottom} id="bottom-source-handle" />
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

    const className = startNode?.data?.className;
    const specName = startNode?.data?.specName;

    let options = [];
    if (Array.isArray(imagesJson) && imagesJson.length && className && specName) {
        for (const entry of imagesJson) {
            if (entry[className] && entry[className][specName]) {
                options = entry[className][specName].map((it) => {
                    const fullUrl = it.url?.startsWith(iconURL) ? it.url : `${iconURL}${it.url}`;
                    return { ...it, url: fullUrl };
                });
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
                        const value = JSON.stringify({ url: opt.url, name: opt.name, types: opt.types });
                        return (
                            <option key={opt.id ?? opt.name} value={value}>{opt.name}</option>
                        );
                    })}
                </select>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {selectedImage && (
                        <img src={selectedImage} alt={selectedName || 'Selected'} style={{ display: 'block', marginTop: '5px', maxWidth: 64 }} />
                    )}
                    {selectedName && (
                        <div style={{ marginTop: 4, fontSize: 12 }}></div>
                    )}
                </div>
                {/* <div className='conditional-checkbox' style={{ top: "50%", position: "absolute", right: "8px" }}>
                    <label style={{ display: 'absolute', alignItems: 'center', top: '5px' }}>If</label>
                    <input type="checkbox" onChange={toggleHandles} checked={data.showHandles || false} />

                    <LimitHandle type="source" position={Position.Right} id="cond-left-source-handle" style={{ position: "absolute", right: "-8px" }} className={!data.showHandles ? 'handle-hidden' : ''} />
                </div> */}
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
    const { setNodes } = useReactFlow();
    const [classSpecs, setClassSpecs] = useState({});
    const [heroTalents, setHeroTalents] = useState({});
    const [classes, setClasses] = useState([]);
    const [className, setClassName] = useState(data?.className || '');
    const [specName, setSpecName] = useState(data?.specName || '');
    const [heroName, setHeroName] = useState(data?.heroName || '');
    useEffect(() => {
        try {
            const json = Array.isArray(abilitiesJson) ? abilitiesJson : [];
            const specs = {};
            const htalents = {};
            const cls = [];
            const excludedKeys = ['Abilities', 'HeroTalents'];
            for (const entry of json) {
                const keys = Object.keys(entry);
                if (!keys.length) continue;
                const c = keys[0];
                htalents[c] = Object.keys(entry[c].HeroTalents || {});
                specs[c] = Object.keys(entry[c] || {}).filter(key => {
                    return !excludedKeys.includes(key);
                });;
                cls.push(c);
            }
            setHeroTalents(htalents);

            setClassSpecs(specs);

            setClasses(cls);
            const defaultClass = data?.className || cls[0] || '';
            const defaultSpec = data?.specName || (specs[defaultClass] ? specs[defaultClass][0] : '');
            const defaultHero = data?.heroName || (htalents[defaultClass] ? htalents[defaultClass][0] : '');
            setClassName(defaultClass);
            setSpecName(defaultSpec);
            setHeroName(defaultHero);
        } catch (e) {
            setClassSpecs({});
            setClasses([]);
            setHeroTalents({});
        }
    }, [data]);

    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, className, specName, heroName } };
                }
                return node;
            })
        );
    }, [className, specName, heroName, id, setNodes]);

    const onClassChange = (e) => {
        const newClass = e.target.value;
        setClassName(newClass);
        const specs = classSpecs[newClass] || [];
        setSpecName(specs[0] || '');
        const hero = heroTalents[newClass] || [];
        setHeroName(hero[0] || '');
    };

    const onSpecChange = (e) => setSpecName(e.target.value);
    const onHeroChange = (e) => setHeroName(e.target.value);

    const specsForClass = classSpecs[className] || [];
    const herosForSpec = heroTalents[className] || [];

    return (
        <div className="apl-start-node" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 8 }}>
            <div>Start</div>
            <div style={{ display: 'flex', gap: 8 }}>
                <select value={className} onChange={onClassChange}>
                    {classes.length ? classes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    )) : <option value="">(no classes)</option>}
                </select>

                <select value={specName} onChange={onSpecChange} disabled={!specsForClass.length}>
                    {specsForClass.length ? specsForClass.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    )) : <option value="">(no specs)</option>}
                </select>
                <select value={heroName} onChange={onHeroChange} disabled={!herosForSpec.length}>
                    {herosForSpec.length ? herosForSpec.map((h) => (
                        <option key={h} value={h}>{h}</option>
                    )) : <option value="">(no heroe talents)</option>}
                </select>
            </div>

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
import React, { useEffect, useState } from 'react';
import { useDnD } from './DnDContext';
import { useReactFlow } from '@xyflow/react';
import abilitiesJson from '../public/SpellIcons/abilities.json';

export default () => {
  const [_, setType] = useDnD();
    const { setNodes } = useReactFlow();
    const [classSpecs, setClassSpecs] = useState({});
    const [heroTalents, setHeroTalents] = useState({});
    const [classes, setClasses] = useState([]);
    const [className, setClassName] = useState('');
    const [specName, setSpecName] = useState('');
    const [heroName, setHeroName] = useState('');
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
            const defaultClass = cls[0] || '';
            const defaultSpec = specs[defaultClass] ? specs[defaultClass][0] : '';
            const defaultHero = htalents[defaultClass] ? htalents[defaultClass][0] : '';
            setClassName(defaultClass);
            setSpecName(defaultSpec);
            setHeroName(defaultHero);
        } catch (e) {
            setClassSpecs({});
            setClasses([]);
            setHeroTalents({});
        }
    }, []);

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

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <div className="description">You can drag these nodes to the pane on the right.</div>

      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <select id="class-select"value={className} onChange={onClassChange}>
          {classes.length ? classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          )) : <option value="">(no classes)</option>}
        </select>
        <select id="spec-select" value={specName} onChange={onSpecChange} disabled={!classSpecs[className]}>
          {classSpecs[className] && classSpecs[className].length ? classSpecs[className].map((s) => (
            <option key={s} value={s}>{s}</option>
          )) : <option value="">(no specs)</option>}
        </select>
        <select id="hero-select" value={heroName} onChange={onHeroChange} disabled={!herosForSpec.length}>
          {herosForSpec.length ? herosForSpec.map((h) => (
            <option key={h} value={h}>{h}</option>
          )) : <option value="">(no heroe talents)</option>}
        </select>
      </div>

      <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'apl-start')} draggable>
        APL Start Node
      </div>
      <div className="dndnode output" onDragStart={(event) => onDragStart(event, 'apl-end')} draggable>
        End Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'ability')} draggable>
        Ability Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, "conditional-cooldown")} draggable>
        Conditional Cooldown Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, "conditional-buff")} draggable>
        Conditional Buff Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, "conditional-gate")} draggable>
        Logic Group
      </div>
    </aside>
  );
};
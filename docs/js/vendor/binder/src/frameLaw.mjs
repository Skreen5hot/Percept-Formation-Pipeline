export function frameRoleSlots(law, frameId) {
  if (!Object.hasOwn(law.frames, frameId)) return [];
  return law.frames[frameId].roles;
}

export function constitutiveRoleSlots(law, frameId) {
  return frameRoleSlots(law, frameId).filter(r => r.constitutive === true);
}

export function subsumes(law, type, target) {
  if (type === target) return true;
  const visited = new Set();
  const queue = [type];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    if (!Object.hasOwn(law.subClassOf, current)) continue;
    for (const parent of law.subClassOf[current]) {
      if (parent === target) return true;
      if (!visited.has(parent)) queue.push(parent);
    }
  }
  return false;
}

export function relatumSatisfied(law, groundedType, relatumType) {
  return subsumes(law, groundedType, relatumType);
}

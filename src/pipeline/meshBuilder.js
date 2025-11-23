/**
 * Mesh Builder Module
 *
 * Generates a procedural humanoid placeholder while we keep the SMPL parts mocked.
 * The goal is to approximate a human silhouette with simple primitives:
 * - Torso: capsule
 * - Head: sphere
 * - Limbs: cylinders
 *
 * Interfaces are unchanged: buildMesh(smplParams) returns a THREE.Group in mock mode
 * and will later emit a real SMPL mesh when models are plugged in.
 */

import * as THREE from 'three';
import { logger, PipelineStage } from './logger.js';
import { pipelineConfig, isRealInference, getMockDelay } from './pipelineConfig.js';

/**
 * Load SMPL model template
 *
 * @returns {Promise<Object>} SMPL model data
 */
async function loadSMPLModel() {
  logger.debug(PipelineStage.MESH, 'SMPL model loading skipped (mock mode)');
  return null;
}

/**
 * Apply SMPL shape blend shapes
 */
function applyShapeBlendShapes(vertices, betas, shapedirs) {
  return vertices;
}

/**
 * Compute joint locations from vertices
 */
function computeJointLocations(vertices, jRegressor) {
  return null;
}

/**
 * Apply Linear Blend Skinning (LBS)
 */
function applyLinearBlendSkinning(vertices, joints, thetas, weights) {
  return vertices;
}

/**
 * Clamp helper
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Derive simple human proportions from SMPL-like params.
 * Falls back to reasonable defaults if values are missing.
 */
function deriveProportions(smplParams) {
  const base = deriveBaseProportions(smplParams);
  const keypoints = smplParams?.keypoints;

  if (!keypoints || keypoints.length === 0) {
    logger.warn(PipelineStage.MESH, 'No keypoints provided to mesh builder - falling back to betas');
    return base;
  }

  const { measures, warnings } = deriveProportionsFromKeypoints(keypoints, base);

  if (warnings.length) {
    logger.warn(
      PipelineStage.MESH,
      `Using mixed keypoint/base proportions: ${warnings.join(', ')}`
    );
  }

  // Merge: keypoint-driven first, fallback to base
  return {
    height: measures.height || base.height,
    shoulderWidth: measures.shoulderWidth || base.shoulderWidth,
    hipWidth: measures.hipWidth || base.hipWidth,
    limbRadius: measures.limbRadius || base.limbRadius,
    headRadius: measures.headRadius || base.headRadius,
    torsoLength: measures.torsoLength || base.torsoLength,
    torsoRadius: measures.torsoRadius || base.torsoRadius,
    upperArmLength: measures.upperArmLength || base.upperArmLength,
    forearmLength: measures.forearmLength || base.forearmLength,
    thighLength: measures.thighLength || base.thighLength,
    shinLength: measures.shinLength || base.shinLength
  };
}

/**
 * Baseline proportions from betas (fallback)
 */
function deriveBaseProportions(smplParams) {
  const betas = smplParams?.betas || [];

  const height = clamp(1.7 + (betas[0] || 0) * 0.12, 1.45, 1.95);
  const shoulderWidth = clamp(0.38 + (betas[1] || 0) * 0.05, 0.28, 0.48);
  const hipWidth = clamp(0.28 + (betas[2] || 0) * 0.05, 0.20, 0.42);
  const limbRadius = clamp(0.04 + (betas[3] || 0) * 0.015, 0.03, 0.07);

  const headRadius = height * 0.075;
  const torsoLength = height * 0.35;
  const torsoRadius = shoulderWidth * 0.35;
  const upperArmLength = height * 0.18;
  const forearmLength = height * 0.18;
  const thighLength = height * 0.25;
  const shinLength = height * 0.25;

  return {
    height,
    shoulderWidth,
    hipWidth,
    limbRadius,
    headRadius,
    torsoLength,
    torsoRadius,
    upperArmLength,
    forearmLength,
    thighLength,
    shinLength
  };
}

/**
 * Helpers for keypoint-driven sizing
 */
function buildKeypointMap(keypoints, minConfidence = 0.3) {
  return keypoints.reduce((acc, kp) => {
    if (kp && kp.name && kp.confidence >= minConfidence) {
      acc[kp.name] = kp;
    }
    return acc;
  }, {});
}

function distance2D(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function midpoint(points) {
  const valid = points.filter(Boolean);
  if (!valid.length) return null;
  const x = valid.reduce((s, p) => s + p.x, 0) / valid.length;
  const y = valid.reduce((s, p) => s + p.y, 0) / valid.length;
  const confidence = valid.reduce((s, p) => s + p.confidence, 0) / valid.length;
  return { x, y, confidence };
}

/**
 * Derive proportions from 2D keypoints (normalized image coords)
 * Scales normalized distances to world units using the base height as target.
 */
function deriveProportionsFromKeypoints(keypoints, base) {
  const kp = buildKeypointMap(keypoints);
  if (Object.keys(kp).length === 0) {
    return { measures: {}, warnings: ['no confident keypoints'] };
  }

  const headPt = kp.nose || kp.left_eye || kp.right_eye;
  const ankleMid = midpoint([kp.left_ankle, kp.right_ankle]);
  const hipMid = midpoint([kp.left_hip, kp.right_hip]);
  const shoulderMid = midpoint([kp.left_shoulder, kp.right_shoulder]);

  const bodyHeightNorm = headPt && ankleMid ? distance2D(headPt, ankleMid) : null;
  const backupHeightNorm = shoulderMid && ankleMid ? distance2D(shoulderMid, ankleMid) : null;
  const heightNorm = bodyHeightNorm || backupHeightNorm;

  // Scale normalized distances into world units targeting base.height
  const scale = heightNorm ? clamp(base.height / heightNorm, 0.5, 3.0) : 1.0;
  const heightWorld = heightNorm ? heightNorm * scale : base.height;

  const measure = (a, b) => (a && b ? distance2D(a, b) * scale : null);

  // Widths
  const shoulderWidth = measure(kp.left_shoulder, kp.right_shoulder);
  const hipWidth = measure(kp.left_hip, kp.right_hip);

  // Upper limbs
  const upperArmLeft = measure(kp.left_shoulder, kp.left_elbow);
  const upperArmRight = measure(kp.right_shoulder, kp.right_elbow);
  const forearmLeft = measure(kp.left_elbow, kp.left_wrist);
  const forearmRight = measure(kp.right_elbow, kp.right_wrist);

  // Lower limbs
  const thighLeft = measure(kp.left_hip, kp.left_knee);
  const thighRight = measure(kp.right_hip, kp.right_knee);
  const shinLeft = measure(kp.left_knee, kp.left_ankle);
  const shinRight = measure(kp.right_knee, kp.right_ankle);

  // Head size: use eye distance or nose-ear distance
  const eyeDistance = measure(kp.left_eye, kp.right_eye);
  const noseEarDistance = measure(kp.nose, kp.right_ear);
  const headWidthEstimate = eyeDistance || (noseEarDistance ? noseEarDistance * 2 : null);

  // Torso length: neck-to-hip if available, else use base
  const neck = kp.neck || kp.nose;
  const torsoLength = neck && hipMid ? measure(neck, hipMid) : null;

  // Clamp outputs around base values to avoid extreme shapes
  const clampAround = (val, baseVal, span = 0.6) => {
    if (val == null) return null;
    return clamp(val, baseVal * (1 - span), baseVal * (1 + span));
  };

  // Limb radius roughly scales with shoulder width
  const limbRadius = shoulderWidth
    ? clamp(shoulderWidth * 0.1, 0.03, 0.08)
    : null;

  // Track missing signals for warning
  const missingSignals = [];
  if (!shoulderWidth) missingSignals.push('shoulder width');
  if (!hipWidth) missingSignals.push('hip width');
  if (!upperArmLeft && !upperArmRight) missingSignals.push('upper arm length');
  if (!forearmLeft && !forearmRight) missingSignals.push('forearm length');
  if (!thighLeft && !thighRight) missingSignals.push('thigh length');
  if (!shinLeft && !shinRight) missingSignals.push('shin length');
  if (!headWidthEstimate) missingSignals.push('head size');
  if (!heightNorm) missingSignals.push('overall height');

  const measures = {
    height: clampAround(heightWorld, base.height, 0.6),
    shoulderWidth: clampAround(shoulderWidth, base.shoulderWidth),
    hipWidth: clampAround(hipWidth, base.hipWidth, 0.8),
    headRadius: clampAround(headWidthEstimate ? headWidthEstimate * 0.35 : null, base.headRadius, 0.4),
    torsoLength: clampAround(torsoLength || null, base.torsoLength, 0.4),
    torsoRadius: clampAround((shoulderWidth || base.shoulderWidth) * 0.35, base.torsoRadius, 0.3),
    upperArmLength: clampAround(
      [upperArmLeft, upperArmRight].filter(Boolean).reduce((s, v, i, arr) => s + v / arr.length, 0) || null,
      base.upperArmLength
    ),
    forearmLength: clampAround(
      [forearmLeft, forearmRight].filter(Boolean).reduce((s, v, i, arr) => s + v / arr.length, 0) || null,
      base.forearmLength
    ),
    thighLength: clampAround(
      [thighLeft, thighRight].filter(Boolean).reduce((s, v, i, arr) => s + v / arr.length, 0) || null,
      base.thighLength
    ),
    shinLength: clampAround(
      [shinLeft, shinRight].filter(Boolean).reduce((s, v, i, arr) => s + v / arr.length, 0) || null,
      base.shinLength
    ),
    limbRadius: limbRadius || base.limbRadius
  };

  return { measures, warnings: missingSignals };
}

/**
 * Create a more human-like procedural mesh using primitives.
 *
 * @param {Object} smplParams - SMPL-like parameters (mock)
 * @returns {THREE.Group} humanoid mesh group
 */
function createProceduralHumanoid(smplParams) {
  const proportions = deriveProportions(smplParams);
  const humanoid = new THREE.Group();

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd6ba,
    metalness: 0.05,
    roughness: 0.8
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0b79f,
    metalness: 0.1,
    roughness: 0.7
  });

  // Torso (capsule)
  const torsoGeom = new THREE.CapsuleGeometry(
    proportions.torsoRadius,
    proportions.torsoLength,
    8,
    12
  );
  const torso = new THREE.Mesh(torsoGeom, skinMaterial);
  torso.position.y = proportions.torsoLength * 0.5 + proportions.hipWidth * 0.1;
  humanoid.add(torso);

  // Head (sphere)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(proportions.headRadius, 16, 16),
    skinMaterial
  );
  head.position.y = torso.position.y + proportions.torsoLength * 0.6 + proportions.headRadius * 1.6;
  humanoid.add(head);

  // Helper to create a limb segment aligned on Y
  const limbSegment = (length, radius, material) => {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 10),
      material
    );
  };

  // Arms
  const shoulderY = torso.position.y + proportions.torsoLength * 0.45;
  const armX = proportions.shoulderWidth * 0.5 + proportions.limbRadius * 0.3;

  // Right arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-armX, shoulderY, 0);
  humanoid.add(rightArmGroup);

  const rightUpperArm = limbSegment(proportions.upperArmLength, proportions.limbRadius, accentMaterial);
  rightUpperArm.position.set(0, -proportions.upperArmLength * 0.5, 0);
  rightArmGroup.add(rightUpperArm);

  const rightForearmGroup = new THREE.Group();
  rightForearmGroup.position.set(0, -proportions.upperArmLength, 0);
  rightArmGroup.add(rightForearmGroup);

  const rightForearm = limbSegment(proportions.forearmLength, proportions.limbRadius * 0.9, skinMaterial);
  rightForearm.position.set(0, -proportions.forearmLength * 0.5, 0);
  rightForearmGroup.add(rightForearm);

  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(proportions.limbRadius * 1.1, 10, 10),
    skinMaterial
  );
  rightHand.position.set(0, -proportions.forearmLength, 0);
  rightForearmGroup.add(rightHand);

  // Left arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(armX, shoulderY, 0);
  humanoid.add(leftArmGroup);

  const leftUpperArm = limbSegment(proportions.upperArmLength, proportions.limbRadius, accentMaterial);
  leftUpperArm.position.set(0, -proportions.upperArmLength * 0.5, 0);
  leftArmGroup.add(leftUpperArm);

  const leftForearmGroup = new THREE.Group();
  leftForearmGroup.position.set(0, -proportions.upperArmLength, 0);
  leftArmGroup.add(leftForearmGroup);

  const leftForearm = limbSegment(proportions.forearmLength, proportions.limbRadius * 0.9, skinMaterial);
  leftForearm.position.set(0, -proportions.forearmLength * 0.5, 0);
  leftForearmGroup.add(leftForearm);

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(proportions.limbRadius * 1.1, 10, 10),
    skinMaterial
  );
  leftHand.position.set(0, -proportions.forearmLength, 0);
  leftForearmGroup.add(leftHand);

  // Legs
  const hipY = proportions.hipWidth * 0.1;
  const hipX = proportions.hipWidth * 0.5;

  // Right leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-hipX, hipY, 0);
  humanoid.add(rightLegGroup);

  const rightThigh = limbSegment(proportions.thighLength, proportions.limbRadius * 1.2, skinMaterial);
  rightThigh.position.set(0, -proportions.thighLength * 0.5, 0);
  rightLegGroup.add(rightThigh);

  const rightShinGroup = new THREE.Group();
  rightShinGroup.position.set(0, -proportions.thighLength, 0);
  rightLegGroup.add(rightShinGroup);

  const rightShin = limbSegment(proportions.shinLength, proportions.limbRadius, accentMaterial);
  rightShin.position.set(0, -proportions.shinLength * 0.5, 0);
  rightShinGroup.add(rightShin);

  const rightFoot = new THREE.Mesh(
    new THREE.BoxGeometry(proportions.limbRadius * 3, proportions.limbRadius * 1.2, proportions.limbRadius * 2),
    skinMaterial
  );
  rightFoot.position.set(0, -proportions.shinLength, proportions.limbRadius);
  rightShinGroup.add(rightFoot);

  // Left leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(hipX, hipY, 0);
  humanoid.add(leftLegGroup);

  const leftThigh = limbSegment(proportions.thighLength, proportions.limbRadius * 1.2, skinMaterial);
  leftThigh.position.set(0, -proportions.thighLength * 0.5, 0);
  leftLegGroup.add(leftThigh);

  const leftShinGroup = new THREE.Group();
  leftShinGroup.position.set(0, -proportions.thighLength, 0);
  leftLegGroup.add(leftShinGroup);

  const leftShin = limbSegment(proportions.shinLength, proportions.limbRadius, accentMaterial);
  leftShin.position.set(0, -proportions.shinLength * 0.5, 0);
  leftShinGroup.add(leftShin);

  const leftFoot = new THREE.Mesh(
    new THREE.BoxGeometry(proportions.limbRadius * 3, proportions.limbRadius * 1.2, proportions.limbRadius * 2),
    skinMaterial
  );
  leftFoot.position.set(0, -proportions.shinLength, proportions.limbRadius);
  leftShinGroup.add(leftFoot);

  // Apply mock pose rotations
  applyMockPose(humanoid, smplParams?.thetas || [], proportions);

  // Lift model so feet sit near ground (account for foot height)
  const footHeight = proportions.limbRadius * 1.2;
  const groundOffset = proportions.thighLength + proportions.shinLength + footHeight * 0.5 - hipY - footHeight * 0.5 + proportions.limbRadius * 0.4;
  humanoid.position.y = clamp(groundOffset, 0, proportions.height);

  return humanoid;
}

/**
 * Apply lightweight procedural pose to the humanoid hierarchy.
 * Rotates limb groups around local hinges using thetas as mild hints.
 */
function applyMockPose(humanoid, thetas, proportions) {
  if (!humanoid || !humanoid.children) return;

  const clampDeg = (deg, min, max) => clamp(deg, min, max) * (Math.PI / 180);
  const thetaAt = (idx) => (thetas && thetas.length > idx ? thetas[idx] : 0);

  // Head yaw: root of humanoid children is head at index? We added in order: torso, head, ...
  const head = humanoid.children.find(child => child.geometry?.type === 'SphereGeometry');
  if (head) {
    const yaw = clampDeg(thetaAt(2) * 20, -20, 20);
    head.rotation.y = yaw;
  }

  // Helpers to find groups by position.x/y heuristics
  const isArmGroup = (g) => g.children?.some(c => c.geometry?.type === 'CylinderGeometry');
  const armGroups = humanoid.children.filter(
    g => g.type === 'Group' && isArmGroup(g) && Math.abs(g.position.y) > 0.1 && Math.abs(g.position.x) > 0.05
  );
  const legGroups = humanoid.children.filter(
    g => g.type === 'Group' && isArmGroup(g) && Math.abs(g.position.y) <= proportions.hipWidth
  );

  // Arm posing: shoulder pitch/roll and elbow hinge
  armGroups.forEach((armGroup, i) => {
    const isLeft = armGroup.position.x > 0;
    const shoulderPitch = clampDeg(thetaAt(isLeft ? 9 : 6) * 40, -40, 40);
    const shoulderRoll = clampDeg(thetaAt(isLeft ? 8 : 5) * 25, -25, 25);

    armGroup.rotation.z = shoulderRoll;
    armGroup.rotation.x = shoulderPitch;

    const forearmGroup = armGroup.children.find(c => c.type === 'Group');
    if (forearmGroup) {
      const elbowBend = clampDeg(thetaAt(isLeft ? 12 : 11) * 60, -5, 90);
      forearmGroup.rotation.x = elbowBend;
    }
  });

  // Leg posing: hip pitch and knee hinge
  legGroups.forEach((legGroup, i) => {
    const isLeft = legGroup.position.x > 0;
    const hipPitch = clampDeg(thetaAt(isLeft ? 16 : 15) * 35, -30, 35);
    legGroup.rotation.x = hipPitch;

    const shinGroup = legGroup.children.find(c => c.type === 'Group');
    if (shinGroup) {
      const kneeBend = clampDeg(thetaAt(isLeft ? 19 : 18) * 60, -10, 90);
      shinGroup.rotation.x = kneeBend;
    }
  });
}

/**
 * Build 3D mesh from SMPL parameters
 *
 * Main entry point for mesh generation.
 *
 * @param {Object} smplParams - SMPL parameters {betas, thetas, ...}
 * @returns {Promise<THREE.Mesh|THREE.Group>} Generated 3D mesh
 */
export async function buildMesh(smplParams) {
  logger.startStage(PipelineStage.MESH);

  try {
    let mesh;

    if (isRealInference() && pipelineConfig.models.smplModel.enabled) {
      logger.info(PipelineStage.MESH, 'Building real SMPL mesh');

      const smplModel = await loadSMPLModel();

      let vertices = applyShapeBlendShapes(
        smplModel.v_template,
        smplParams.betas,
        smplModel.shapedirs
      );

      const joints = computeJointLocations(vertices, smplModel.J_regressor);

      vertices = applyLinearBlendSkinning(
        vertices,
        joints,
        smplParams.thetas,
        smplModel.weights
      );

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(Array.from(smplModel.faces).flat());
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        metalness: 0.1,
        roughness: 0.8
      });

      mesh = new THREE.Mesh(geometry, material);
    } else {
      logger.info(PipelineStage.MESH, 'Building procedural humanoid mock');

      const delay = getMockDelay('mesh');
      await new Promise(resolve => setTimeout(resolve, delay));

      mesh = createProceduralHumanoid(smplParams);
    }

    logger.endStage(PipelineStage.MESH, {
      type: mesh.type,
      children: mesh.children?.length || 0,
      vertices: mesh.geometry?.attributes?.position?.count || 'N/A'
    });

    return mesh;
  } catch (error) {
    logger.error(PipelineStage.MESH, 'Mesh building failed', error);
    throw error;
  }
}

/**
 * Export mesh to file format (OBJ, GLB, etc.)
 */
export function exportMesh(mesh, format = 'obj') {
  logger.info(PipelineStage.MESH, `Mesh export to ${format} not implemented`);
  return null;
}

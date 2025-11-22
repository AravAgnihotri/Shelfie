# Overview

This is a React-based web application that implements a 3D human body modeling pipeline. The application processes 2D images of people and converts them into 3D mesh representations using the SMPL (Skinned Multi-Person Linear) model. Built with React 19, Vite, and Three.js, it provides an interactive 3D visualization environment for human pose and shape estimation.

The core pipeline follows: Image Input → 2D Keypoint Extraction → SMPL Parameter Fitting → 3D Mesh Generation → Three.js Rendering.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Framework
- **Technology**: React 19 with Vite bundler
- **Rationale**: Vite provides fast hot module reloading and optimized builds for rapid development
- **TypeScript Support**: Configured but currently using JSX files; supports migration to TSX
- **Routing**: React Router DOM v7.9.6 for multi-page navigation

## 3D Rendering System
- **Technology**: Three.js with React Three Fiber and Drei helpers
- **Rationale**: React Three Fiber provides declarative Three.js integration with React's component model, making 3D scene management more intuitive
- **Components**: 
  - `@react-three/fiber`: React renderer for Three.js
  - `@react-three/drei`: Pre-built helper components for common 3D scenarios

## ML Pipeline Architecture

The application implements a modular, staged processing pipeline:

### Stage 1: Keypoint Extraction (`keypoints.js`) ✅ UPGRADED
- **Purpose**: Extract 2D body joint positions from input images
- **Current State**: **REAL MediaPipe Pose** (November 2025)
- **Implementation**: 
  - MediaPipe Pose via CDN (browser-based, WebGL accelerated)
  - Detects 33 landmarks, maps to 17 COCO keypoints
  - File → HTMLImageElement conversion
  - Real-time pose detection on uploaded images
  - Confidence filtering (threshold: 0.5)
- **Integration**: CDN scripts loaded in `index.html`, no npm packages required
- **Trade-offs**: Browser-based = faster UX, no server needed; Limited to single person detection

### Stage 2: SMPL Parameter Fitting (`smplFit.js`)
- **Purpose**: Convert 2D keypoints to SMPL body model parameters
- **Parameters**:
  - Betas (β): 10 shape coefficients for body proportions
  - Thetas (θ): 72 pose coefficients (24 joints × 3 axis-angle)
  - Camera parameters (translation, scale)
- **Planned Approaches**:
  - HMR 2.0 regression model (state-of-the-art, fast)
  - SMPLify-X optimization (slower but more accurate)
  - SPIN or CLIFF models (balance of speed and accuracy)
- **Trade-offs**: Regression models are faster; optimization-based methods provide better fitting but require more computation

### Stage 3: Mesh Generation (`meshBuilder.js`)
- **Purpose**: Generate renderable 3D mesh from SMPL parameters
- **SMPL Model Specs**:
  - 6890 vertices, 13776 faces
  - Linear Blend Skinning (LBS) for deformation
  - Shape and pose blend shapes
- **Implementation**: Creates Three.js BufferGeometry with vertices, faces, and normals

## Configuration System (`pipelineConfig.js`)
- **Design Pattern**: Centralized configuration with mode switching
- **Features**:
  - `inferenceMode`: Toggle between 'mock' (development) and 'real' (production)
  - Model path management for different ML backends
  - Hardware acceleration settings (GPU/WebGL support)
- **Rationale**: Enables development without ML models while maintaining production-ready architecture

## State Management
- **Hook**: `usePipeline.js` - Custom React hook for pipeline orchestration
- **State Tracked**:
  - Loading status and current pipeline stage
  - Progress percentage (0-100)
  - Intermediate results (keypoints, SMPL params)
  - Final mesh output and metadata
  - Error handling
- **Design Pattern**: Encapsulates complex async pipeline logic in reusable hook

## Logging and Monitoring (`logger.js`)
- **Purpose**: Structured logging for pipeline debugging and performance tracking
- **Features**:
  - Session-based tracking with unique IDs
  - Stage timing measurements
  - Log level filtering (DEBUG, INFO, WARN, ERROR)
  - Performance metrics collection
- **Rationale**: Essential for debugging ML pipelines and optimizing performance

## Development Server Configuration
- **Host**: `0.0.0.0` (accessible from network)
- **Port**: 5000 (strict port enforcement)
- **Hot Reload**: Enabled via Vite HMR

# External Dependencies

## Core Framework Dependencies
- **react** & **react-dom** (19.2.0): UI framework
- **vite** (5.0.0): Build tool and dev server
- **@vitejs/plugin-react** (4.2.0): React Fast Refresh support

## 3D Graphics Libraries
- **three** (0.181.2): WebGL 3D library
- **@react-three/fiber** (9.4.0): React renderer for Three.js
- **@react-three/drei** (10.7.7): Helper components for React Three Fiber

## Routing
- **react-router-dom** (7.9.6): Client-side routing

## Planned ML Dependencies (Not Yet Integrated)
The architecture is designed to support these future integrations:
- **@mediapipe/tasks-vision** or **@mediapipe/pose**: Browser-based pose estimation
- **@tensorflow/tfjs** or **@tensorflow-models/pose-detection**: Alternative pose detection
- **SMPL model files**: Binary model data (PKL/NPZ format) for body mesh generation
- **HMR2/SPIN/CLIFF model weights**: Pre-trained regression models for SMPL fitting

## Potential Backend Services
The architecture supports REST API integration for:
- Server-side ML inference (OpenPose, HRNet, ViTPose)
- SMPL parameter optimization
- High-quality mesh generation with GPU acceleration

## Development Tools
- **TypeScript** (5.2.2): Type checking (configured but optional)
- **@types/react** & **@types/react-dom**: TypeScript definitions
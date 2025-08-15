# src-nextgen - Mobile Native Fresh Next Generation

## Overview

This directory contains the next generation architecture for the mobile-native-fresh project, implementing a phased migration strategy with comprehensive testing and validation.

## Strategy: B + D + E

- **B**: Clean rebuild from src-reference/ (most defensible)
- **D**: Dual-mount architecture (enables safe testing)
- **E**: Hybrid renderer shell (controlled transition)

## Structure

- `patches/` - Phase-organized patch files for GPT and Cursor
- `docs/` - Technical documentation and strategy guides
- `scripts/` - Validation and coordination scripts
- `summaries/` - Phase completion summaries
- `tracking/` - Progress tracking and metrics
- `validation/` - Automated validation tools

## Phases

- **Phase 0**: Foundation and dual-mount architecture
- **Phase 1**: Component migration and role-based wrappers
- **Phase 2**: Navigation and shell migration
- **Phase 3**: Optimization and consolidation

## Key Features

- ✅ Dual-mount architecture with environment toggles
- ✅ Sacred component protection system
- ✅ Role-based wrapper enforcement
- ✅ Comprehensive test coordination
- ✅ Automated dependency validation
- ✅ Visual debug overlays
- ✅ CI/CD pipeline integration

## Quick Start

1. Run validation: `node scripts/validate-patch-dependencies.js`
2. Check test coordination: `node scripts/test-coordination.js`
3. Update documentation: `node scripts/update-documentation.js`
4. Cleanup documentation: `node scripts/cleanup-documentation.js`

## Recent Updates

- Integrated splash mount guard (P0.5.3)
- Added visual overlay debug (P1.3.5)
- Implemented auto test map (P2.9.8)
- Bootstrapped CI pipeline (P2.9.9)
- Consolidated documentation (ROADMAP.md)

## Validation Status

- ✅ Dependencies: Valid
- ✅ Execution Order: Valid
- ⚠️ Build Commands: Partially standardized
- ✅ Test Coordination: Generated

## Documentation

- `ROADMAP.md` - Comprehensive strategy and execution plan
- `PATCH_MANIFEST.json` - Complete patch registry
- `test-map.json` - Test coordination mapping
- `INDEX.md` - File index and navigation

Last updated: 2025-07-19T17:57:11.552Z

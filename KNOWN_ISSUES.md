# Design Diary - Known Issues Tracker

*Last Updated: 2025-07-22*

## 🎯 Purpose
This document tracks known issues, their status, and verification results to maintain context across development sessions.

## 📋 How to Use This Document
- **You (Lewis)**: Add new issues, update priorities, provide user testing feedback
- **AI Assistant**: Update status, document attempted fixes, record verification results
- **Both**: Keep this current to maintain development context

---

## 🔥 Critical Issues (Blocking Core Functionality)

*(No critical issues currently blocking core functionality)*

---

## ⚠️ High Priority Issues

### 6. PDF Generation System Failure
- **Status**: 🔥 **CRITICAL**: Blocking core functionality
- **Description**: PDF export functionality completely fails with multiple severe issues:
  - **Browser Timeout**: PDF generation causes browser to hang indefinitely, requiring force-quit of VSCode
  - **Infinite Loops**: Complex html2canvas rendering logic creates infinite loops in PDF generation service
  - **Memory Issues**: PDF generation process consumes excessive memory and never completes
  - **UI Freeze**: Application becomes completely unresponsive during PDF export attempts
- **Root Cause**: The PDFGenerationService contains overly complex html2canvas-based rendering that attempts to:
  - Create virtual DOM containers for each cell
  - Render complex Monaco Editor instances to canvas
  - Process multiple rendering passes with layout calculations
  - Handle image loading and canvas manipulation that never resolves
- **Impact**: 
  - PDF export is completely unusable
  - Can crash the entire development environment
  - Forces user to restart VSCode and lose work
  - Blocks core document export functionality
- **Attempted Fixes**:
  - 2025-07-22: Simplified PDF generation to text-only approach using jsPDF
  - 2025-07-22: Removed all html2canvas dependencies and complex rendering logic
  - 2025-07-22: Implemented basic text-based PDF with cell content and metadata
- **Current Status**: ❌ **STILL BROKEN** - Simplified implementation still hangs browser and generates nothing
- **Verification Results**: 2025-07-22 - User confirmed PDF export still completely fails:
  - Browser still hangs indefinitely during PDF generation
  - No PDF file is generated
  - Application becomes unresponsive
  - Simplified text-based approach did not resolve the core issue
- **Next Steps**: 
  - Investigate why even simplified jsPDF approach hangs
  - Consider completely different PDF generation strategy
  - May need to implement server-side PDF generation instead
  - Debug what specific code is causing the infinite loop/hang
- **Priority**: CRITICAL - PDF export functionality is completely unusable

---

## 📋 Medium Priority Issues

### 7. Add Page Functionality
- **Status**: 🆕 **NEW**: Feature request - not yet implemented
- **Description**: Need ability to insert a new blank page into the document at a specific location
- **Requested Behavior**: 
  - "Add Page" button/function should insert a new blank page immediately below the currently selected cell
  - This refers to on-screen page layout, not printing pages
  - Should maintain proper page boundaries and layout structure
- **Current Limitation**: 
  - No way to insert additional pages into existing documents
  - Users cannot organize content across multiple pages
  - All content must fit on single page or overflow unpredictably
- **Impact**: 
  - Limits document organization capabilities
  - Prevents logical separation of content sections
  - Reduces usability for larger documents
- **Implementation Considerations**:
  - Need to determine page insertion logic relative to selected cell
  - Should integrate with existing page layout system
  - Must maintain proper cell positioning across page boundaries
  - Consider how this affects save/load functionality
- **Priority**: MEDIUM - Enhancement that would improve document organization
- **Next Steps**: 
  - Design page insertion UI/UX
  - Implement page creation logic
  - Test with existing cell positioning system
  - Ensure compatibility with import/export functionality

### 8. WYSIWYG Print Layout (PDF Layout Matching)
- **Status**: 🆕 **NEW**: Feature request - should be incorporated into PDF rebuild
- **Description**: PDF/print output should exactly replicate the on-screen view without adding margins or changing layout
- **Current Problem**: 
  - PDF generation adds margins that reduce useful area
  - Print layout differs from on-screen layout
  - User's carefully designed on-screen layout is not preserved in output
- **Requested Behavior**: 
  - On-screen layout should be exactly what appears in PDF/print
  - No additional margins should be added during PDF generation
  - User controls layout on-screen, PDF follows this exactly
  - "What You See Is What You Get" principle
- **Impact**: 
  - Users cannot predict how their document will look when printed/exported
  - Reduces effective page area in PDF output
  - Breaks design intent and layout precision
  - Makes it difficult to create professional-looking documents
- **Implementation Requirements**:
  - PDF generation must capture exact on-screen dimensions and positioning
  - Remove any automatic margin addition in PDF export
  - Ensure 1:1 correspondence between screen pixels and PDF layout
  - Consider page size settings and scaling factors
- **Integration with PDF Rebuild**: 
  - This requirement should be built into the new PDF generation system
  - When PDF generation is rebuilt, prioritize exact layout matching
  - Test with various page sizes and orientations
- **Priority**: MEDIUM - Should be incorporated into PDF system rebuild
- **Next Steps**: 
  - Include this requirement in PDF generation system redesign
  - Research PDF libraries that support exact layout matching
  - Test layout preservation across different screen sizes and zoom levels

---

## 🔧 Low Priority / Enhancement Issues

### 9. Text Cell Edit/Render Button Redundancy
- **Status**: 🆕 **NEW**: Enhancement request - improve text cell UX
- **Description**: Text cells have redundant render button and could use JupyterLab-style double-click editing
- **Current Behavior**: 
  - Text cells have both "Edit" and "Render" buttons in addition to toolbar
  - "Render" button duplicates functionality of "Execute" button in main toolbar
  - Requires explicit button clicks to enter/exit edit mode
- **Requested Improvements**: 
  - Remove redundant "Render" button (use main toolbar "Execute" instead)
  - Replace "Edit" button with double-click to enter edit mode (JupyterLab style)
  - Single click or Escape to exit edit mode and render
  - Maintain consistency with JupyterLab interaction patterns
- **Benefits**: 
  - Cleaner, less cluttered text cell interface
  - More intuitive editing workflow matching JupyterLab
  - Reduces button redundancy and UI complexity
  - Faster editing workflow for power users
- **Implementation Considerations**:
  - Need to handle double-click detection vs single-click selection
  - Ensure edit mode state is properly managed
  - Consider keyboard shortcuts (Enter to edit, Escape to render)
  - Test interaction with cell selection and dragging
- **Priority**: LOW - UI/UX enhancement that improves workflow
- **Next Steps**: 
  - Remove render button from text cell component
  - Implement double-click edit mode entry
  - Add single-click or Escape to exit edit mode
  - Test interaction patterns for usability

### 10. Cell Toolbar Positioning and Obstruction
- **Status**: 🆕 **NEW**: Enhancement request - improve cell toolbar UX
- **Description**: Cell toolbar appears on focus but covers content in top-right corner, obstructing first few lines
- **Current Behavior**: 
  - Cell toolbar becomes visible when cell gains focus
  - Toolbar positioned in top-right corner of cell
  - Covers and obstructs the first few lines of cell content
  - Fixed position that cannot be moved when it blocks important content
- **Requested Improvements**: 
  - Move toolbar to bottom of cell instead of top-right
  - Make toolbar floating/draggable so it can be repositioned when necessary
  - Ensure toolbar doesn't obstruct cell content by default
  - Consider auto-positioning based on available space
- **Benefits**: 
  - Cell content remains fully visible when toolbar is active
  - User can reposition toolbar when it conflicts with content
  - More professional appearance without content obstruction
  - Better usability for cells with important content at the top
- **Implementation Considerations**:
  - Need to implement draggable toolbar functionality
  - Consider toolbar positioning relative to cell boundaries
  - Ensure toolbar remains accessible and doesn't go off-screen
  - Test with different cell sizes and content types
  - Consider saving toolbar position preferences per cell or globally
- **Priority**: LOW - UI/UX enhancement that improves content visibility
- **Next Steps**: 
  - Move default toolbar position to bottom of cell
  - Implement floating/draggable toolbar functionality
  - Add position persistence if needed
  - Test with various cell sizes and content layouts

---

## ✅ Resolved Issues

### 1. Code Cell Execution Numbering
- **Status**: ✅ **FIXED**: Verified working by user
- **Description**: Code cells show duplicate execution numbers (e.g., both showing "2")
- **Impact**: Confusing execution sequence, hard to track cell execution order
- **Last Attempted Fix**: 2025-07-22 - Changed display from `executionOrder` to `executionCount`
- **Verification Results**: 2025-07-22 - User confirmed working correctly
- **Priority**: RESOLVED

### 2. Output Cell Position Preservation
- **Status**: ✅ **FIXED**: Verified working by user for all code cells
- **Description**: Output cells change positions when code cells are re-executed
- **Original Problem**:
  - Output cells would jump around and multiply on re-execution
  - Position preservation only worked for first code cell
  - Layout became unpredictable for multi-cell notebooks
- **Solution Implemented**: 2025-07-23 - Complete rewrite of position preservation logic
  - Smart position matching by output type (text, error, image, success)
  - Consistent ordering via Y-position sorting of existing output cells
  - Robust fallback logic when saved positions are exhausted
  - Enhanced debugging and error handling
- **Verification Results**: 2025-07-23 - User confirmed position preservation now works for all code cells
- **Priority**: RESOLVED

### 4. Import Dialog Path Display
- **Status**: ✅ **FIXED**: Verified working by user
- **Description**: Recent files in import dialog only showed filename, not full path
- **Impact**: Hard to distinguish files with same name in different directories
- **Last Fix**: 2025-07-22 - Added two-line layout showing full path
- **Verification Needed**: Open import dialog, check recent files show full paths
- **Priority**: MEDIUM

### 5. Cell Creation Execution Order
- **Status**: ✅ **FIXED**: Verified working by user
- **Description**: New code cells were getting automatic execution order assignment
- **Impact**: Confusing numbering system, execution order should only be for executed cells
- **Last Attempted Fix**: 2025-07-22 - Removed automatic execution order assignment
- **Verification Needed**: Create new code cells, verify they have no execution number until executed
- **Priority**: LOW

### 3. Code Cell Insertion Execution Order
- **Status**: ✅ **FIXED**: Implemented smart insertion logic with renumbering
- **Description**: When a new code cell is inserted between existing cells, execution order numbering was incorrect
- **Original Problem**: 
  - New cell inserted before cell 4 got execution order at end of document (e.g., became cell 6)
  - Existing cells after insertion point kept their original execution order
  - No renumbering of subsequent cells occurred
- **Solution Implemented**: 2025-07-23 - Enhanced addCell() function with smart insertion logic
  - Modified addCell() to support insertAfterCellId parameter for targeted insertion
  - Implemented insertion position detection based on selected cells or explicit parameter
  - Added automatic renumbering of subsequent cells when inserting between existing cells
  - New cells inserted before cell 4 now become new cell 4, with cells 4+ incrementing
  - Maintains logical sequence: 1, 2, 3, [new 4], [old 4→5], [old 5→6], etc.
  - Enhanced debugging output for execution order assignment
- **Technical Details**:
  - Smart insertion logic determines position based on selected code cells or insertAfterCellId
  - Automatic renumbering ensures execution order reflects logical document flow
  - Falls back to end-of-document insertion when no insertion point specified
  - Maintains backward compatibility with existing cell creation workflows
- **Priority**: RESOLVED

### 4. Output Cell Execution Order Display on Import
- **Status**: ✅ **FIXED**: Output cells now display execution order numbers on import
- **Description**: On import, code cells displayed execution order correctly, but output cells didn't show matching numbers
- **Original Problem**: 
  - Code cells showed execution order numbers immediately on import (1, 2, 3, etc.)
  - Output cells only showed execution order numbers after code cell was re-executed
  - Created disconnect between code cells and their associated outputs
- **Solution Implemented**: 2025-07-23 - Fixed Jupyter conversion service to preserve execution order
  - Enhanced convertJupyterOutputsToDesignDiaryCells() to properly pass executionOrder parameter
  - Output cells now inherit and display execution order from their source code cells
  - Ensures execution order numbers are visible immediately on import
  - Maintains visual consistency between code cells and their outputs
- **Technical Details**:
  - Fixed parameter passing in jupyterConversionService.ts
  - Output cells now properly inherit executionOrder from source code cells
  - Enhanced debugging output for execution order assignment during import
  - Improves document comprehension by clearly linking outputs to code cells
- **Priority**: RESOLVED

### 6. PDF Generation Multi-Page Support
- **Status**: ✅ **FIXED**: Verified working by user
- **Description**: PDF generation was single page only, additional pages not rendered
- **Impact**: Generated PDFs had incorrect layout, content was cut off
- **Last Fix**: 2025-07-22 - Implemented exact Canvas.tsx page layout matching with proper save dialog
- **Additional Enhancement**: PDF save dialog now defaults to workbook filename and uses File System Access API
- **Priority**: RESOLVED
---

## 📝 Notes for Development Sessions

### Workflow Recommendations
1. **Start each session**: Review this document and ask about current priorities
2. **Pick one issue**: Focus on single issue per session for complex problems
3. **Test thoroughly**: Verify fix works before marking as resolved
4. **Update status**: Document what was attempted and results
5. **User verification**: Lewis should test and confirm fixes work as expected

### Testing Checklist
- [ ] Code cell numbering: Create 3+ code cells, execute in different orders
- [ ] Output positioning: Execute same cell multiple times, check output stays put
- [ ] PDF generation: Test both landscape and portrait orientations
- [ ] Import dialog: Check recent files show full paths
- [ ] Cell creation: Verify new cells have no execution numbers

---

## 🏷️ Status Legend
- 🔥 **CRITICAL**: Blocking core functionality
- 🔄 **ATTEMPTED FIX**: Code changes made, needs verification
- ✅ **FIXED**: Verified working by user
- ❌ **BROKEN**: Confirmed not working
- 🆕 **NEW**: Recently discovered, not yet addressed
- 📋 **PLANNED**: Scheduled for future work

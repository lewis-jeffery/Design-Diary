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



---

## 🔧 Low Priority / Enhancement Issues



---

## ✅ Resolved Issues

*(Issues will be moved here after verification)*
### 1. Code Cell Execution Numbering
- **Status**: ✅ **FIXED**: Verified working by user
- **Description**: Code cells show duplicate execution numbers (e.g., both showing "2")
- **Impact**: Confusing execution sequence, hard to track cell execution order
- **Last Attempted Fix**: 2025-07-22 - Changed display from `executionOrder` to `executionCount`
- **Verification Needed**: Test creating and executing multiple code cells
- **Priority**: HIGH

### 2. Output Cell Position Preservation
- **Status**: 🔄 **PARTIALLY FIXED**: Works for code cell 1, broken for cells 2+
- **Description**: Output cells change positions when code cells are re-executed, but fix only works for first code cell
- **Current Behavior**:
  - ✅ **Code Cell 1**: Output cell position preservation works correctly, outputs overwrite in place
  - ❌ **Code Cells 2+**: Position preservation fails completely
  - ❌ **Missing Execution Order**: Code cells 2+ have no blue execution order dot on their output cells after import
  - ❌ **New Cell Generation**: Instead of reusing existing output cells, new output cells are generated on each execution
- **Impact**: 
  - Layout becomes unpredictable for multi-cell notebooks
  - Output cells multiply and jump around for cells 2 and above
  - Execution order tracking is broken for imported notebooks with multiple cells
- **Root Cause**: Array indexing logic in position reuse only works correctly for the first cell (index 0)
- **Last Attempted Fix**: 2025-07-22 - Simplified position reuse logic using array indexing (incomplete fix)
- **Verification Results**: 2025-07-22 - User confirmed works for cell 1, fails for cells 2+
- **Next Steps**: 
  - Debug why array indexing fails for cells beyond index 0
  - Fix execution order assignment for imported output cells
  - Ensure output cell reuse works for all code cells, not just the first
- **Priority**: HIGH - Critical for multi-cell notebook functionality

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

### 3. PDF Generation Multi-Page Support
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

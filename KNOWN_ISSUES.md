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

### 1. Code Cell Execution Numbering
- **Status**: 🔄 ATTEMPTED FIX - NOT VERIFIED
- **Description**: Code cells show duplicate execution numbers (e.g., both showing "2")
- **Impact**: Confusing execution sequence, hard to track cell execution order
- **Last Attempted Fix**: 2025-07-22 - Changed display from `executionOrder` to `executionCount`
- **Verification Needed**: Test creating and executing multiple code cells
- **Priority**: HIGH

### 2. Output Cell Position Preservation
- **Status**: 🔄 ATTEMPTED FIX - NOT VERIFIED  
- **Description**: Output cells change positions when code cells are re-executed
- **Impact**: Layout becomes unpredictable, cells jump around
- **Last Attempted Fix**: 2025-07-22 - Simplified position reuse logic using array indexing
- **Verification Needed**: Execute same code cell multiple times, verify outputs stay in place
- **Priority**: HIGH

---

## ⚠️ High Priority Issues

### 3. PDF Generation Orientation
- **Status**: 🔄 ATTEMPTED FIX - PARTIALLY WORKING
- **Description**: PDF generation not respecting canvas orientation (landscape/portrait)
- **Impact**: Generated PDFs have incorrect layout, content may be cut off
- **Last Attempted Fix**: 2025-07-22 - Fixed container dimensions calculation
- **Verification Needed**: Generate PDFs in both orientations, check content fits properly
- **Priority**: MEDIUM-HIGH

---

## 📋 Medium Priority Issues

### 4. Import Dialog Path Display
- **Status**: ✅ FIXED - NOT VERIFIED
- **Description**: Recent files in import dialog only showed filename, not full path
- **Impact**: Hard to distinguish files with same name in different directories
- **Last Fix**: 2025-07-22 - Added two-line layout showing full path
- **Verification Needed**: Open import dialog, check recent files show full paths
- **Priority**: MEDIUM

---

## 🔧 Low Priority / Enhancement Issues

### 5. Cell Creation Execution Order
- **Status**: 🔄 ATTEMPTED FIX - NOT VERIFIED
- **Description**: New code cells were getting automatic execution order assignment
- **Impact**: Confusing numbering system, execution order should only be for executed cells
- **Last Attempted Fix**: 2025-07-22 - Removed automatic execution order assignment
- **Verification Needed**: Create new code cells, verify they have no execution number until executed
- **Priority**: LOW

---

## ✅ Resolved Issues

*(Issues will be moved here after verification)*

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

# ResearchSpace Shared State Implementation Guide

## Overview

The ResearchSpace Shared State system enables components to share their state through URL parameters, allowing users to save and share specific application states. This guide explains how to implement shared state functionality in your components.

## Architecture

The shared state system consists of three main components:

### 1. AppState Component
- **Purpose**: Central state manager that coordinates all shared state
- **Responsibilities**:
  - Manages global shared state registry
  - Serializes/deserializes state to/from URL parameters or backend storage
  - Provides "Save States" button for generating shareable URLs
  - Handles state synchronization between components
  - Supports two storage modes: URL-based and backend-based

### 2. SharedStateComponent Base Class
- **Purpose**: Base class that provides shared state functionality
- **Responsibilities**:
  - Automatic registration/unregistration with AppState
  - State synchronization handling
  - Lifecycle management
  - Default state sync behavior

### 3. SharedStateUtils
- **Purpose**: Utility functions for state management
- **Responsibilities**:
  - Creates SharedStateManager instances
  - Handles event communication
  - Manages state variable parsing

### 4. AppStateStorageEndpoint (Backend)
- **Purpose**: REST endpoint for storing application states in backend
- **Responsibilities**:
  - Stores state data with unique IDs
  - Retrieves state by ID
  - Manages state persistence
  - Provides secure access control

## Converting a Component to SharedStateComponent

### Step 1: Update Component Declaration

Change your component from extending `Component` to extending `SharedStateComponent`:

```typescript
// Before
import { Component } from 'platform/api/components';

export class MyComponent extends Component<MyProps, MyState> {
  // ...
}

// After
import { SharedStateComponent, SharedStateProps } from '../app-state/SharedStateComponent';

export type MyComponentProps = MyConfig & SharedStateProps & Props<any>;

export class MyComponent extends SharedStateComponent<MyComponentProps, MyState> {
  // ...
}
```

### Step 2: Move Shareable Variables to Component State

**Important**: Only variables in the component's React state can be shared. If you have variables stored as class properties that you want to share, you must move them to the state.

```typescript
// Before - Not shareable
export class MyComponent extends Component<MyProps, MyState> {
  private selectedItem: string;
  private viewMode: string = 'grid';
  
  state = {
    isLoading: boolean;
    data: any[];
  };
}

// After - Shareable
export class MyComponent extends SharedStateComponent<MyComponentProps, MyState> {
  state = {
    isLoading: boolean;
    data: any[];
    selectedItem: string | undefined;  // Moved to state
    viewMode: string;                  // Moved to state
  };
}
```

### Step 3: Handle componentDidMount Override

**Critical**: If your component overrides `componentDidMount`, you MUST call `super.componentDidMount()` to ensure proper registration with AppState.

```typescript
public componentDidMount() {
  // REQUIRED: Call parent's componentDidMount for AppState registration
  super.componentDidMount();
  
  // Your component's initialization logic
  this.initializeComponent();
  this.loadData();
  
  // Optional: Request current state from AppState after initialization
  setTimeout(() => {
    this.requestCurrentState();
  }, 100);
}
```

**Note**: If your component doesn't need custom initialization in `componentDidMount`, don't override it - the parent's implementation will be automatically inherited.

### Step 4: Override handleSharedStateSync (Optional)

The base class provides a default implementation that automatically syncs matching state variables. Override this method for custom behavior:

```typescript
protected handleSharedStateSync(syncedState: any): void {
  // Custom validation or transformation
  if (syncedState.viewMode && this.isValidViewMode(syncedState.viewMode)) {
    this.setState({ viewMode: syncedState.viewMode });
  }
  
  // Handle complex state restoration
  if (syncedState.selectedItem) {
    this.selectItem(syncedState.selectedItem);
  }
}
```

### Step 5: Configure Shared State Variables in Templates

In your HTML templates, specify which state variables should be shared:

```html
<app-state id="my-app-state" save-button-position="top-right">
  <my-component 
    id="my-component-1"
    shared-state-vars="selectedItem,viewMode"
    app-state-id="my-app-state"
  />
</app-state>
```

## Storage Modes

AppState supports two storage modes to handle different use cases:

### 1. URL Storage Mode (Default)
- **How it works**: State is encoded directly in URL parameters
- **Real-time sync**: Changes are immediately reflected in the URL
- **Limitations**: Limited by URL length (typically ~2000 characters)
- **Best for**: Small to medium state data, real-time collaboration

```html
<app-state id="my-app-state" auto-sync="true">
  <!-- Components here -->
</app-state>
```

### 2. Backend Storage Mode
- **How it works**: State is stored in backend, only state ID in URL
- **No size limits**: Can handle large state data
- **Manual save**: State is only saved when "Save States" button is clicked
- **Unsaved changes warning**: Users are warned before leaving with unsaved changes
- **Best for**: Large state data, complex applications

```html
<app-state id="my-app-state" storage-mode="backend">
  <!-- Components here -->
</app-state>
```

### Comparison

| Feature | URL Mode | Backend Mode |
|---------|----------|--------------|
| State size limit | ~2KB | Unlimited |
| Real-time URL sync | ✅ Yes | ❌ No |
| Auto-save | ✅ Yes | ❌ No (manual) |
| Page leave warning | ❌ No | ✅ Yes (if unsaved) |
| Server dependency | ❌ No | ✅ Yes |
| Shareable URLs | ✅ Yes | ✅ Yes |

### Backend Mode Considerations

When using backend storage mode:

1. **Permissions**: The backend storage mode uses the `services:url-minify` permission for all operations. This design choice ensures that:
   - **Accessible to regular users**: The url-minify permission is typically available to all authenticated users
   - **Conceptual alignment**: State sharing is similar to URL bookmarking - both enable saving and sharing views
   - **No admin privileges required**: Users don't need administrative permissions to save states
   
   The permission required is:
   - **`services:url-minify`** - Required for all state operations (save, load, delete)
     - Rationale: State sharing is conceptually similar to URL shortening/bookmarking
     - This permission is already granted to most authenticated users
     - Provides a consistent experience across URL and backend storage modes

2. **Storage**: States are stored in the platform's runtime storage under `/app-states/` folder
   - Each state is saved as a JSON file with a UUID filename
   - Includes metadata: creation time, creator, and original page URL

3. **Persistence**: States are persistent but may be subject to cleanup policies
   - States remain available as long as the runtime storage is maintained
   - System administrators can implement cleanup policies if needed

4. **Security**: States are associated with the user who created them
   - The creator's username is stored in the state metadata
   - Access control follows the standard ResearchSpace security model

### Permission Troubleshooting

If users encounter permission errors when using backend storage mode:

1. **"Permission denied" for any state operation**: 
   - Ensure the user has `services:url-minify` permission
   - This permission is typically available to all authenticated users by default

2. **Granting permissions**:
   - Permissions can be granted through the ResearchSpace security administration interface
   - Add `services:url-minify` to the user's role or directly to the user
   - Note: This is the same permission used for the URL shortening service

## Best Practices

### 1. State Variable Selection
- Only share variables that are meaningful to restore
- Avoid sharing temporary UI states (loading, error states)
- Consider URL length when selecting variables to share

### 2. State Serialization
- Keep shared state simple and serializable
- Avoid circular references
- Use primitive types when possible
- For complex objects, consider storing only IDs

### 3. State Initialization
- Always provide default values for shared state variables
- Handle cases where shared state might be incomplete or invalid
- Validate restored state before applying

### 4. Performance Considerations
- Use debouncing for frequently changing states (already handled by AppState)
- Avoid sharing large data structures
- Consider using IDs instead of full objects

## Common Patterns

### Pattern 1: Simple State Sharing

```typescript
export class SimpleComponent extends SharedStateComponent<SimpleProps, SimpleState> {
  state = {
    selectedTab: 'overview',
    sortOrder: 'asc'
  };
  
  // No need to override anything else - default behavior handles it
}
```

### Pattern 2: Complex State with Validation

```typescript
export class ComplexComponent extends SharedStateComponent<ComplexProps, ComplexState> {
  state = {
    filters: {},
    selectedItems: [],
    viewConfig: {}
  };
  
  protected handleSharedStateSync(syncedState: any): void {
    const validatedState: any = {};
    
    // Validate and transform filters
    if (syncedState.filters && this.validateFilters(syncedState.filters)) {
      validatedState.filters = syncedState.filters;
    }
    
    // Validate selected items exist
    if (syncedState.selectedItems) {
      validatedState.selectedItems = syncedState.selectedItems.filter(
        id => this.itemExists(id)
      );
    }
    
    this.setState(validatedState);
  }
}
```

### Pattern 3: Async State Restoration

```typescript
export class AsyncComponent extends SharedStateComponent<AsyncProps, AsyncState> {
  protected handleSharedStateSync(syncedState: any): void {
    if (syncedState.selectedResourceId) {
      // Store the ID, load the resource asynchronously
      this.setState({ selectedResourceId: syncedState.selectedResourceId }, () => {
        this.loadResource(syncedState.selectedResourceId);
      });
    }
  }
}
```

## Debugging Tips

### 1. Enable Console Logging
The system includes comprehensive logging. Check the browser console for:
- Component registration/unregistration
- State sync events
- URL updates
- Parsing errors

### 2. Common Issues

**Issue**: State not being restored from URL
- Check that the component has an `id` attribute
- Verify `shared-state-vars` includes the variable names
- Ensure variables are in the component's React state
- Confirm `super.componentDidMount()` is called if overridden

**Issue**: State changes not updating URL
- Verify the component is wrapped in an `<app-state>` component
- Check that `auto-sync` is enabled on AppState
- Ensure you're using `setState()` to update values

**Issue**: Invalid state after restoration
- Implement validation in `handleSharedStateSync`
- Handle missing or malformed data gracefully
- Provide sensible defaults

### 3. URL Format
Understanding the URL format helps with debugging:
```
?states=component1=base64encodedstate&component2=base64encodedstate
```

The base64 encoding prevents issues with special characters in state values.

## Example: Complete Implementation

Here's a complete example showing all concepts:

```typescript
import { SharedStateComponent, SharedStateProps } from '../app-state/SharedStateComponent';

interface DataTableConfig {
  query: string;
  pageSize?: number;
}

export type DataTableProps = DataTableConfig & SharedStateProps & Props<any>;

interface DataTableState {
  currentPage: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedRows: string[];
  data: any[];
  isLoading: boolean;
}

export class DataTable extends SharedStateComponent<DataTableProps, DataTableState> {
  constructor(props: DataTableProps, context: ComponentContext) {
    super(props, context);
    
    this.state = {
      currentPage: 1,
      sortColumn: 'name',
      sortDirection: 'asc',
      selectedRows: [],
      data: [],
      isLoading: false
    };
  }
  
  public componentDidMount() {
    // Required: Register with AppState
    super.componentDidMount();
    
    // Load initial data
    this.loadData();
    
    // Request any existing shared state
    setTimeout(() => {
      this.requestCurrentState();
    }, 100);
  }
  
  protected handleSharedStateSync(syncedState: any): void {
    // Only sync UI state, not data
    const stateToApply: any = {};
    
    if (typeof syncedState.currentPage === 'number') {
      stateToApply.currentPage = syncedState.currentPage;
    }
    
    if (syncedState.sortColumn && syncedState.sortDirection) {
      stateToApply.sortColumn = syncedState.sortColumn;
      stateToApply.sortDirection = syncedState.sortDirection;
    }
    
    if (Array.isArray(syncedState.selectedRows)) {
      stateToApply.selectedRows = syncedState.selectedRows;
    }
    
    this.setState(stateToApply, () => {
      // Re-sort data if sort params changed
      if (stateToApply.sortColumn || stateToApply.sortDirection) {
        this.sortData();
      }
    });
  }
  
  private handlePageChange = (page: number) => {
    // Using setState automatically syncs with AppState
    this.setState({ currentPage: page });
  }
  
  private handleSort = (column: string) => {
    this.setState(prevState => ({
      sortColumn: column,
      sortDirection: prevState.sortColumn === column && prevState.sortDirection === 'asc' 
        ? 'desc' 
        : 'asc'
    }), () => {
      this.sortData();
    });
  }
}
```

Template usage:
```html
<app-state id="data-view-state" auto-sync="true">
  <data-table
    id="main-table"
    shared-state-vars="currentPage,sortColumn,sortDirection,selectedRows"
    app-state-id="data-view-state"
    query="SELECT * FROM ..."
  />
</app-state>
```

## Summary

The Shared State system provides a powerful way to make your ResearchSpace components shareable and bookmarkable. By following this guide, you can:

1. Convert existing components to support shared state
2. Properly manage component lifecycle with inheritance
3. Handle state synchronization robustly
4. Debug common issues effectively

Remember the key principles:
- Only React state can be shared
- Always call `super.componentDidMount()` when overriding
- Validate restored state before applying
- Keep shared state simple and serializable

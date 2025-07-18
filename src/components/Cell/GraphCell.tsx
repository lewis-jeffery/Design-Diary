import React, { useCallback } from 'react';
import styled from 'styled-components';
import { GraphCell as GraphCellType } from '../../types';
import { useStore } from '../../store/useStore';

const GraphCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const GraphControls = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
`;

const ChartTypeSelect = styled.select`
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 11px;
  background: white;
`;

const DataInput = styled.textarea`
  width: 100%;
  height: 80px;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  resize: vertical;
  margin-bottom: 8px;
`;

const GraphDisplay = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: white;
  min-height: 200px;
`;

const PlaceholderChart = styled.div`
  width: 80%;
  height: 80%;
  border: 2px dashed #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  text-align: center;
  font-size: 14px;
`;

interface GraphCellProps {
  cell: GraphCellType;
}

const GraphCell: React.FC<GraphCellProps> = ({ cell }) => {
  const { updateCell } = useStore();

  const handleChartTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const currentHints = (cell as any).renderingHints || {};
    updateCell(cell.id, { 
      renderingHints: { 
        ...currentHints, 
        chartType: e.target.value 
      } 
    });
  }, [cell.id, updateCell]);

  const handleDataChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const data = JSON.parse(e.target.value);
      const currentHints = (cell as any).renderingHints || {};
      updateCell(cell.id, { 
        renderingHints: { 
          ...currentHints, 
          data 
        } 
      });
    } catch (error) {
      // Invalid JSON, but still update the raw text for user to see
      console.log('Invalid JSON data');
    }
  }, [cell.id, updateCell]);

  const sampleData = {
    line: `{
  "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
  "datasets": [{
    "label": "Sales",
    "data": [10, 20, 15, 25, 30]
  }]
}`,
    bar: `{
  "labels": ["A", "B", "C", "D"],
  "datasets": [{
    "label": "Values",
    "data": [12, 19, 3, 17]
  }]
}`,
    scatter: `{
  "datasets": [{
    "label": "Points",
    "data": [
      {"x": 1, "y": 2},
      {"x": 2, "y": 4},
      {"x": 3, "y": 1}
    ]
  }]
}`,
    pie: `{
  "labels": ["Red", "Blue", "Yellow"],
  "datasets": [{
    "data": [300, 50, 100]
  }]
}`
  };

  return (
    <GraphCellContainer>
      <GraphControls>
        <label>
          Chart Type:
          <ChartTypeSelect
            value={(cell as any).renderingHints?.chartType || 'line'}
            onChange={handleChartTypeChange}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="scatter">Scatter Plot</option>
            <option value="pie">Pie Chart</option>
          </ChartTypeSelect>
        </label>
      </GraphControls>
      
      <DataInput
        value={JSON.stringify((cell as any).renderingHints?.data, null, 2) || sampleData[((cell as any).renderingHints?.chartType || 'line') as keyof typeof sampleData]}
        onChange={handleDataChange}
        placeholder={`Enter JSON data for ${(cell as any).renderingHints?.chartType || 'line'} chart...`}
      />
      
      <GraphDisplay>
        <PlaceholderChart>
          {((cell as any).renderingHints?.chartType || 'line').toUpperCase()} CHART
          <br />
          <small>Chart visualization would appear here</small>
          <br />
          <small>(Chart.js integration needed)</small>
        </PlaceholderChart>
      </GraphDisplay>
    </GraphCellContainer>
  );
};

export default GraphCell;

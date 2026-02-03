import React from "react";
import { ProvisionalPatentWizard } from "./provisional";

interface PatentWizardProps {
  filing_id: string;
  onComplete?: () => void;
}

export const IPGeniePatentWizard: React.FC<PatentWizardProps> = ({ 
  filing_id, 
  onComplete 
}) => {
  return (
    <ProvisionalPatentWizard 
      filingId={filing_id} 
      onComplete={onComplete} 
    />
  );
};

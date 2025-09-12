-- Update AI Prompt Templates for Patent Filing with IPGenie Structure
-- Clear existing patent templates and create IPGenie-optimized ones

DELETE FROM ai_prompt_templates WHERE template_type = 'patent';

-- Step 1: Patent Abstract Generator (USPTO-compliant)
INSERT INTO ai_prompt_templates (
  template_name,
  template_type,
  section_type,
  prompt_text,
  input_variables,
  model_parameters,
  is_active
) VALUES (
  'ipgenie_patent_abstract',
  'patent',
  'abstract',
  'You are an expert patent writer. Generate a USPTO-compliant abstract (150 words max) for this invention.

FORMAT REQUIREMENTS:
- Single paragraph
- Present tense
- Technical language (no marketing)
- Include: technical field, problem, solution, key advantage
- Follow USPTO MPEP guidelines

INVENTION DATA:
Title: {{title}}
Summary: {{summary}}
Problem Solved: {{problem}}
How it Works: {{mechanism}}
Key Components: {{components}}
Advantages: {{advantages}}

Generate a professional patent abstract that clearly describes the invention''s technical aspects and benefits.',
  '["title", "summary", "problem", "mechanism", "components", "advantages"]',
  '{"temperature": 0.2, "max_tokens": 300}',
  true
),

-- Step 2: Background of Invention
(
  'ipgenie_patent_background',
  'patent',
  'background',
  'Write a comprehensive "Background of the Invention" section following USPTO requirements.

STRUCTURE:
1. Field of the Invention (1 sentence establishing technical domain)
2. Description of Related Art (2-3 paragraphs)
3. Problems with existing solutions
4. Need for the invention

INVENTION DATA:
Title: {{title}}
Problem: {{problem}}
Existing Solutions Context: {{mechanism}}
Technical Field: Based on {{components}}

Use formal technical language. Do NOT describe what the invention does - only set up the need for it.',
  '["title", "problem", "mechanism", "components"]',
  '{"temperature": 0.3, "max_tokens": 800}',
  true
),

-- Step 3: Summary of Invention
(
  'ipgenie_patent_summary',
  'patent',
  'summary',
  'Generate a "Summary of the Invention" section that provides a clear technical overview.

REQUIREMENTS:
- Describe the invention''s core concept
- Explain primary objectives
- Highlight key technical features
- Include main advantages
- Use precise technical language

INVENTION DATA:
Title: {{title}}
Summary: {{summary}}
Mechanism: {{mechanism}}
Components: {{components}}
Advantages: {{advantages}}

Create a comprehensive summary that bridges the background to the detailed description.',
  '["title", "summary", "mechanism", "components", "advantages"]',
  '{"temperature": 0.2, "max_tokens": 600}',
  true
),

-- Step 4: Detailed Description
(
  'ipgenie_patent_detailed_description',
  'patent',
  'detailed_description',
  'Write a comprehensive "Detailed Description of the Invention" section.

STRUCTURE:
1. Overview of the invention
2. Detailed explanation of components/elements
3. Step-by-step operation description
4. Alternative embodiments (if applicable)
5. Advantages and benefits

TECHNICAL REQUIREMENTS:
- Reference drawings (if mentioned)
- Use consistent terminology
- Provide sufficient detail for person skilled in art
- Include specific examples

INVENTION DATA:
Title: {{title}}
Summary: {{summary}}
Problem: {{problem}}
Mechanism: {{mechanism}}
Components: {{components}}
Advantages: {{advantages}}

Generate detailed technical documentation suitable for patent examination.',
  '["title", "summary", "problem", "mechanism", "components", "advantages"]',
  '{"temperature": 0.3, "max_tokens": 1500}',
  true
),

-- Step 5: Patent Claims Generator
(
  'ipgenie_patent_claims',
  'patent',
  'claims',
  'Generate patent claims following strict USPTO requirements and 35 U.S.C. §112.

CLAIM STRUCTURE:
- Start with "What is claimed is:"
- Independent claim 1: Broad but novel
- Dependent claims 2-5: Narrow specific features
- Use proper antecedent basis (a, the, said)
- Single sentence per claim
- Precise technical language

INVENTION DATA:
Core Innovation: {{summary}}
Key Elements: {{components}}
Technical Process: {{mechanism}}
Unique Advantages: {{advantages}}

Format as numbered claims with proper legal language and claim dependencies.',
  '["summary", "components", "mechanism", "advantages"]',
  '{"temperature": 0.2, "max_tokens": 800}',
  true
),

-- Step 6: Brief Description of Drawings (if applicable)
(
  'ipgenie_patent_drawings_brief',
  'patent',
  'brief_description_drawings',
  'Generate a "Brief Description of the Drawings" section if drawings are referenced.

FORMAT:
- Figure-by-figure description
- Brief description of what each figure shows
- Standard patent language

INVENTION DATA:
Components: {{components}}
Mechanism: {{mechanism}}

If no specific drawings are described, generate a standard template for typical patent drawings based on the invention type.',
  '["components", "mechanism"]',
  '{"temperature": 0.2, "max_tokens": 400}',
  true
);

-- Update conversation flow for better patent interview
-- This will be handled in the code updates
// Provisional Patent Wizard Types

export interface WizardQuestion {
  id: string;
  type: 'text' | 'textarea' | 'list' | 'multi_select';
  label: string;
  hint: string;
  example: string | string[];
  required: boolean;
  options?: string[];
  validation: {
    min_chars?: number;
    max_chars?: number;
    min_items?: number;
    max_items?: number;
    min_item_chars?: number;
    min_selected?: number;
    max_selected?: number;
  };
}

export interface QualityScore {
  overall: number;
  completeness: number;
  specificity: number;
  embodiments: number;
  clarity: number;
}

export interface WizardAnswers {
  title?: string;
  one_sentence?: string;
  problem?: string;
  users_industry?: string;
  current_solutions?: string;
  current_limits?: string;
  differentiators?: string[];
  technical_explanation?: string;
  components_steps?: string[];
  walkthrough?: string;
  variations?: string;
  required_optional?: string;
  constraints?: string;
  environment?: string;
  equivalents?: string;
  keywords?: string[];
  similar_products?: string;
  figures?: string[];
}

export interface IntakeRecord {
  id: string;
  user_id: string;
  filing_id?: string;
  wizard_version: string;
  answers_json: WizardAnswers;
  quality_score?: number;
  status: 'draft' | 'ready_for_payment' | 'paid' | 'generating' | 'ready' | 'failed' | 'deleted';
  created_at: string;
  updated_at: string;
  delete_after: string;
}

export interface FollowupRule {
  id: string;
  trigger: string;
  prompt: string;
}

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: "title",
    type: "text",
    label: "Working title of your invention",
    hint: "Short, descriptive name. You can change later.",
    example: "Self-locking ladder stabilizer with auto-leveling feet",
    required: true,
    validation: { min_chars: 5, max_chars: 120 }
  },
  {
    id: "one_sentence",
    type: "text",
    label: "In one sentence: what does it do?",
    hint: "Describe outcome + mechanism in plain language.",
    example: "A clip-on ladder accessory that automatically levels and locks to uneven surfaces to prevent slip.",
    required: true,
    validation: { min_chars: 25, max_chars: 280 }
  },
  {
    id: "problem",
    type: "textarea",
    label: "What problem does it solve?",
    hint: "Describe the pain, why it matters, and when it happens.",
    example: "Ladders slip on uneven ground causing injuries; existing stabilizers require manual adjustment and are often ignored due to setup time.",
    required: true,
    validation: { min_chars: 80, max_chars: 2000 }
  },
  {
    id: "users_industry",
    type: "textarea",
    label: "Who has this problem?",
    hint: "People, roles, industries, environments.",
    example: "Roofers, painters, maintenance workers, homeowners using extension ladders on driveways, lawns, or stairs.",
    required: true,
    validation: { min_chars: 40, max_chars: 1200 }
  },
  {
    id: "current_solutions",
    type: "textarea",
    label: "What are common solutions today?",
    hint: "Name alternatives: products, workflows, hacks.",
    example: "Manual stabilizer bars, leveling blocks, having a second person hold ladder, adjustable feet add-ons.",
    required: true,
    validation: { min_chars: 50, max_chars: 1500 }
  },
  {
    id: "current_limits",
    type: "textarea",
    label: "What's wrong with current solutions?",
    hint: "Be specific: cost, time, reliability, safety, training.",
    example: "Manual leveling takes too long; user error leads to misalignment; some add-ons fit only certain ladder models; bulky to transport.",
    required: true,
    validation: { min_chars: 80, max_chars: 2000 }
  },
  {
    id: "differentiators",
    type: "list",
    label: "Top 3–7 ways your invention is different",
    hint: "Bullets. Each should be a real feature, not marketing.",
    example: ["Auto-leveling feet with spring-loaded detents", "One-handed locking mechanism with audible click", "Universal clamp fits ladder rails 1.25–2.5 inches"],
    required: true,
    validation: { min_items: 3, max_items: 7, min_item_chars: 10 }
  },
  {
    id: "technical_explanation",
    type: "textarea",
    label: "Explain it like you're talking to an engineer",
    hint: "Describe parts + how they interact. Use steps and cause-effect.",
    example: "The device mounts to both ladder rails via a cam clamp. Each rail has an independent foot assembly with a telescoping leg and a spring pawl that engages a ratchet track. When the ladder loads, the pawl allows downward movement but prevents upward movement unless the release lever is pulled.",
    required: true,
    validation: { min_chars: 150, max_chars: 4000 }
  },
  {
    id: "components_steps",
    type: "list",
    label: "List the main components (or steps) in order",
    hint: "Think: parts of a system or steps of a method.",
    example: ["Rail clamp assembly", "Left auto-leveling foot module", "Right auto-leveling foot module", "Lock/release lever", "Ratchet track and pawl"],
    required: true,
    validation: { min_items: 4, max_items: 20, min_item_chars: 6 }
  },
  {
    id: "walkthrough",
    type: "textarea",
    label: "Walk through one full use-case from start to finish",
    hint: "Start at setup and end at result; include user actions.",
    example: "User clips device to ladder rails near base, sets ladder on driveway edge, device feet auto-adjust to height difference, user climbs; under load the feet lock; user then pulls release lever to retract legs and remove device.",
    required: true,
    validation: { min_chars: 120, max_chars: 2500 }
  },
  {
    id: "variations",
    type: "textarea",
    label: "Describe at least 2–3 variations (alternative embodiments)",
    hint: "Different materials, sensors, locking methods, form factors, software vs hardware versions, etc.",
    example: "Variation A uses a worm-gear leg instead of ratchet. Variation B uses a single crossbar foot instead of independent legs. Variation C integrates a bubble-level + indicator lights.",
    required: true,
    validation: { min_chars: 120, max_chars: 2500 }
  },
  {
    id: "required_optional",
    type: "textarea",
    label: "What parts are required vs optional?",
    hint: "Helps define broad coverage vs nice-to-haves.",
    example: "Required: rail clamps, locking foot mechanism. Optional: indicator lights, replaceable pads, quick-release carry handle.",
    required: true,
    validation: { min_chars: 60, max_chars: 1500 }
  },
  {
    id: "constraints",
    type: "textarea",
    label: "Any measurements, performance targets, or constraints?",
    hint: "Numbers help patents: sizes, ranges, forces, latency, temperature, materials.",
    example: "Fits rails 1.25–2.5 in; supports 300 lb load; leg travel up to 6 in; operates -10°C to 45°C; aluminum + nylon composite.",
    required: false,
    validation: { min_chars: 0, max_chars: 1200 }
  },
  {
    id: "environment",
    type: "textarea",
    label: "Where does it operate (environment/platform)?",
    hint: "Physical location, digital platform, regulatory environment.",
    example: "Outdoor residential/commercial use; uneven terrain; rain exposure; compatible with standard extension ladders.",
    required: true,
    validation: { min_chars: 40, max_chars: 1200 }
  },
  {
    id: "equivalents",
    type: "textarea",
    label: "What could be replaced with equivalents?",
    hint: "E.g., camera/sensor types, materials, protocols, algorithms.",
    example: "Ratchet could be replaced by cam lock or wedge lock; feet pad material could be rubber, silicone, or textured polymer.",
    required: true,
    validation: { min_chars: 60, max_chars: 1500 }
  },
  {
    id: "keywords",
    type: "list",
    label: "3–12 keywords someone might search to find similar inventions",
    hint: "Used to guide user through prior-art awareness and to improve drafting language.",
    example: ["ladder stabilizer", "auto leveling feet", "ratchet lock", "uneven surface ladder"],
    required: true,
    validation: { min_items: 3, max_items: 12, min_item_chars: 3 }
  },
  {
    id: "similar_products",
    type: "textarea",
    label: "Any similar products/patents you know about (optional)",
    hint: "Links or names. If none, say 'none known.'",
    example: "Werner ladder stabilizer; Levelok adjustable ladder feet; none known beyond those.",
    required: false,
    validation: { min_chars: 0, max_chars: 1500 }
  },
  {
    id: "figures",
    type: "multi_select",
    label: "Which figures would best explain it?",
    options: [
      "System diagram",
      "Mechanical assembly diagram",
      "Flowchart / method steps",
      "Electrical block diagram",
      "UI screens (if software)",
      "State diagram",
      "Exploded view",
      "Cross-section view"
    ],
    hint: "Choose 1–4.",
    example: [],
    required: true,
    validation: { min_selected: 1, max_selected: 4 }
  }
];

export const FIGURE_OPTIONS = [
  "System diagram",
  "Mechanical assembly diagram",
  "Flowchart / method steps",
  "Electrical block diagram",
  "UI screens (if software)",
  "State diagram",
  "Exploded view",
  "Cross-section view"
];

export const QUALITY_WEIGHTS = {
  completeness: 0.35,
  specificity: 0.30,
  embodiments: 0.20,
  clarity: 0.15
};

export const MIN_QUALITY_SCORE = 0.72;

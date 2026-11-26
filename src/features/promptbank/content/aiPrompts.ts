import type { AiPromptEntry } from '../types'

// Every prompt carries its own role, evidence rules and output format, and ends
// with a "[Paste ... here]" slot where the person's findings go.

export const AI_PROMPTS: AiPromptEntry[] = [
  {
    id: 'ai-market-research-synthesis',
    kind: 'ai-prompt',
    section: 'market',
    stage: 'gap-analysis',
    title: 'Analyse market evidence',
    purpose: 'Find patterns, opportunities and uncertainty in collected market findings.',
    placeholders: ['niche'],
    prompt: `Act as a careful market research analyst. Analyse the research findings I provide about {niche}.

Use ONLY the supplied findings. Do not invent market size, statistics, prices, customer behaviour, sources or facts. Do not treat a few observations as proof of an entire market trend.

For every important conclusion, identify the supporting finding IDs or titles. Separate direct observations from your interpretations. Label unsupported ideas as hypotheses.

Return the following Markdown report:

## 1. Market Signals
List the strongest observed demand signals, trends, opportunities and risks.

## 2. Repeated Patterns
Identify themes appearing across multiple findings. Show which findings support each theme.

## 3. Contradictions
Identify findings that disagree or suggest different market conditions.

## 4. Evidence Gaps
List what is still unknown, including missing market size, demand, buying behaviour or geographic information.

## 5. Possible Opportunities
Suggest up to five opportunities that follow logically from the evidence. Label each as a hypothesis, not an established fact.

## 6. Next Research Actions
Recommend five specific actions that could verify or disprove the most important hypotheses.

## 7. Confidence Assessment
For each major conclusion, rate the evidence as strong, moderate or weak and explain why.

If the findings are insufficient, say so rather than filling the gaps.

RESEARCH FINDINGS:
[Paste your market research findings here]`,
    good_looks_like:
      'The AI gives an evidence-linked market summary, points out contradictions and missing information, and leaves you with concrete questions to investigate next.',
  },
  {
    id: 'ai-competitor-analysis',
    kind: 'ai-prompt',
    section: 'competitor',
    stage: 'competitor-analysis',
    title: 'Compare competitor offers',
    purpose: 'Compare competitor positioning, pricing, promises and offer weaknesses.',
    placeholders: ['niche', 'audience'],
    prompt: `Act as a competitor research analyst. Compare the competitor findings I provide for {niche}, especially offers targeting {audience}.

Use only the supplied research. Do not invent prices, features, customer opinions, market share or competitor strategies. Treat missing information as unknown. Identify the finding IDs or titles supporting every important comparison. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Competitor Overview
Create a table with competitor, offer, recorded price, target audience and main promise. Use 'Not recorded' where information is missing.

## 2. Positioning Patterns
Identify similarities and differences in how competitors position their offers.

## 3. Pricing Comparison
Compare only prices explicitly present in the findings. Do not estimate missing prices.

## 4. Offer Strengths
Identify useful features, benefits, guarantees and proof points actually documented.

## 5. Weaknesses and Gaps
Identify documented complaints, unanswered questions and missing offer elements. Separate evidence from interpretation.

## 6. Underserved Customers
Identify audience groups or needs that appear less directly addressed by the supplied competitors.

## 7. Research Priorities
Recommend five practical checks that could strengthen or challenge the competitor analysis.

## 8. Possible Positioning Opportunities
Suggest up to three differentiated positioning hypotheses grounded in the findings.

Do not assume that a competitor's advertising claims are true simply because they are published.

COMPETITOR FINDINGS:
[Paste competitor findings here]`,
    good_looks_like:
      'You get a useful comparison table, clear pricing evidence, documented weaknesses and differentiated positioning hypotheses, with no made-up competitor information.',
  },
  {
    id: 'ai-advertising-pattern-analysis',
    kind: 'ai-prompt',
    section: 'advertising',
    stage: 'angle-development',
    title: 'Analyse advertising patterns',
    purpose: 'Identify repeated hooks, creative approaches and underused advertising angles.',
    placeholders: ['niche', 'platform'],
    prompt: `Act as an advertising research analyst. Analyse the advertising findings I collected from {platform} about {niche}.

Use only the ads and observations supplied. Do not claim that an ad is successful, profitable or high-converting unless the findings contain actual performance evidence. Do not invent engagement, reach, conversion rates or advertiser intentions. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Ad Inventory
Summarise the ads, platforms, hooks and recorded calls to action.

## 2. Hook Categories
Group the hooks by approach, such as pain, desire, curiosity, proof, urgency, comparison or education. Use only categories supported by the examples.

## 3. Repeated Messages
Identify messages and creative approaches appearing across multiple ads.

## 4. Creative Patterns
Compare visuals, opening scenes, demonstrations, proof and calls to action where recorded.

## 5. Underused Angles
Identify customer problems, desires or proof approaches that are missing or uncommon in the supplied sample. State that absence from the sample does not prove absence from the entire market.

## 6. Testable Hook Ideas
Suggest five new hook hypotheses. Each must identify the supporting research findings and explain what makes the idea worth testing.

## 7. Next Steps
Recommend three inexpensive creative tests.

Use finding IDs or titles for evidence. Label all new ideas as hypotheses.

ADVERTISING FINDINGS:
[Paste advertising findings here]`,
    good_looks_like:
      'The output identifies real advertising patterns, separates observed repetition from proven performance, and gives you testable hook hypotheses.',
  },
  {
    id: 'ai-customer-voice-analysis',
    kind: 'ai-prompt',
    section: 'customer',
    stage: 'pain-and-trigger',
    title: 'Decode customer language',
    purpose: 'Identify recurring customer pains, desires, triggers and objections.',
    placeholders: ['audience', 'niche'],
    prompt: `Act as a customer research analyst. Analyse the customer findings I provide about {audience} in {niche}.

Preserve the original customer wording wherever possible. Do not invent quotations, emotions, demographics, motivations or behaviour. Do not assume that two similar comments come from the same type of person.

Separate direct customer statements from your interpretation. Cite finding IDs or titles for every important theme. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Customer Groups
Identify distinct audience groups supported by the supplied evidence. Do not create demographic profiles without evidence.

## 2. Repeated Pain Points
Create a table showing pain point, supporting customer language and supporting findings.

## 3. Desired Outcomes
List what customers explicitly say they want.

## 4. Triggers
Identify events or situations that appear to make the problem urgent.

## 5. Objections
Group objections into price, trust, time, complexity, risk or other categories where supported.

## 6. Exact Customer Language
Extract useful verbatim phrases from the supplied findings. Do not rewrite them as quotations.

## 7. Unknowns
Identify what cannot be determined from the findings.

## 8. Follow-up Questions
Suggest ten short questions that could help verify the biggest uncertainties.

## 9. Possible Messaging Angles
Suggest up to five hypotheses based on the documented pains and desires. Link each to supporting evidence.

CUSTOMER FINDINGS:
[Paste customer findings here]`,
    good_looks_like:
      'You receive a structured bank of customer language, distinct pain and desire patterns, documented objections and useful follow-up questions.',
  },
  {
    id: 'ai-product-opportunity-analysis',
    kind: 'ai-prompt',
    section: 'product',
    stage: 'gap-analysis',
    title: 'Find product opportunities',
    purpose: 'Discover product improvements and unmet needs from product and review findings.',
    placeholders: ['niche', 'audience'],
    prompt: `Act as a product research analyst. Examine the product findings I collected about {niche} and the needs of {audience}.

Use only the supplied findings. Do not invent product features, prices, reviews, customer experiences or demand. Do not assume that a complaint represents all customers. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Existing Products
Summarise the products, features and recorded prices.

## 2. Customer Appreciation
Identify features and outcomes customers explicitly appreciate.

## 3. Repeated Complaints
Group documented complaints and identify their supporting findings.

## 4. Missing Features and Unmet Needs
Identify requests, workarounds and problems that existing products appear not to address in the supplied evidence.

## 5. Improvement Opportunities
Suggest up to five product improvements. For each, state the evidence, the hypothesis and the uncertainty.

## 6. Potential Offer Differentiation
Explain how a product might address a documented weakness without making unsupported superiority claims.

## 7. Validation Questions
List the questions that should be answered before building a product.

## 8. Cheapest Test
Recommend the smallest practical experiment to test the strongest opportunity.

Use finding IDs or titles throughout. Mark ideas as hypotheses, not proven demand.

PRODUCT FINDINGS:
[Paste product findings here]`,
    good_looks_like:
      'The AI finds product weaknesses and improvement hypotheses tied to real reviews and observations, then suggests a cheap way to check demand.',
  },
  {
    id: 'ai-keyword-intent-analysis',
    kind: 'ai-prompt',
    section: 'keyword',
    stage: 'audience',
    title: 'Analyse search intent',
    purpose: 'Group keywords by the questions and buying intentions behind them.',
    placeholders: ['niche'],
    prompt: `Act as a search intent research analyst. Analyse the keyword findings I provide for {niche}.

Use only the supplied keywords and search observations. Do not invent search volumes, keyword difficulty, rankings or conversion rates. Do not claim that a keyword has high demand unless actual evidence is supplied. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Keyword Groups
Group related keywords by topic and customer problem.

## 2. Likely Search Intent
Classify each keyword as informational, problem-aware, solution-seeking, comparison or purchase-oriented. Mark uncertain classifications.

## 3. Customer Questions
Identify the questions implied by the keywords.

## 4. Buying Language
Highlight phrases that suggest a searcher is comparing or preparing to buy.

## 5. Missing Topics
Identify customer questions or search themes that appear missing from the supplied findings.

## 6. Content Opportunities
Suggest useful article, video or landing-page topics linked to the relevant keywords.

## 7. Research Gaps
List search volumes, competition levels or actual ranking evidence that would need separate verification.

## 8. Priority List
Rank five research opportunities by apparent relevance to the documented customer problems. Explain the reasoning without pretending to know search volume.

Cite the supplied keyword findings for important classifications.

KEYWORD FINDINGS:
[Paste keyword findings here]`,
    good_looks_like:
      'Keywords are grouped by likely intent and customer need, with content opportunities identified and no made-up SEO numbers.',
  },
  {
    id: 'ai-general-research-synthesis',
    kind: 'ai-prompt',
    section: 'general',
    stage: 'gap-analysis',
    title: 'Make sense of research notes',
    purpose: 'Find recurring themes, contradictions and missing information across general findings.',
    placeholders: ['niche'],
    prompt: `Act as a research synthesis assistant. Examine the general research findings I provide about {niche}.

Your job is to organise the evidence, not to make decisions for me.

Use only the supplied findings. Do not invent facts, statistics, prices, quotations, sources or events. Do not treat an interpretation as an observation. Cite finding IDs or titles for every important conclusion. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Main Discoveries
Summarise the most useful observations.

## 2. Recurring Themes
Group findings that appear to relate to the same underlying issue.

## 3. Contradictions
Show findings that disagree or suggest competing explanations.

## 4. Possible Connections
Identify relationships between findings that may be worth investigating. Label them as interpretations.

## 5. Unanswered Questions
List the most important things the research does not yet establish.

## 6. Research Priorities
Suggest five concrete next actions.

## 7. Possible Opportunities
Suggest up to five research-backed hypotheses.

## 8. Evidence Assessment
Rate the evidence behind each major hypothesis as strong, moderate or weak and explain the rating.

Do not recommend an offer or marketing angle unless the findings provide enough evidence to justify exploring it.

GENERAL FINDINGS:
[Paste general findings here]`,
    good_looks_like:
      'You receive an organised research summary with traceable evidence, useful connections, contradictions and clear next steps.',
  },
  {
    id: 'ai-customer-pain-vs-competitor-claims',
    kind: 'ai-prompt',
    section: 'general',
    stage: 'gap-analysis',
    title: 'Compare customer pain with competitor claims',
    purpose: 'Find mismatches between what customers need and what competitors promise.',
    placeholders: ['niche'],
    prompt: `Act as a market positioning analyst. Compare the customer findings and competitor findings I provide for {niche}.

Use only the supplied findings. Do not invent customer needs, competitor promises, prices, product features or market facts. Do not assume that a competitor's claim is true simply because it appears in an advertisement.

Identify the finding IDs or titles supporting each conclusion. Clearly distinguish customer statements, competitor claims and your interpretations. Label hypotheses clearly.

Return this Markdown report:

## 1. Customer Problems
List the main documented customer pains, desires and objections.

## 2. Competitor Promises
List the main documented competitor promises and offers.

## 3. Alignment Table
Create a table with customer need, competitor response, supporting findings and apparent coverage.

## 4. Unaddressed Needs
Identify customer problems that do not appear to be directly addressed by the competitors in the supplied research.

## 5. Promise-Evidence Mismatches
Identify competitor claims that lack supporting evidence in the research or appear disconnected from documented customer needs.

## 6. Possible Positioning Gaps
Suggest up to five differentiated positioning hypotheses.

## 7. What to Verify
List the research required before treating any gap as a genuine opportunity.

## 8. Cheapest Validation Test
Recommend one low-cost experiment for the strongest hypothesis.

Do not claim that a need is unmet across the entire market merely because it is absent from this sample.

CUSTOMER FINDINGS:
[Paste customer findings here]

COMPETITOR FINDINGS:
[Paste competitor findings here]`,
    good_looks_like:
      'The analysis shows where customer needs and competitor messaging line up or diverge, with evidence-backed opportunities instead of invented advantages.',
  },
  {
    id: 'ai-research-gap-audit',
    kind: 'ai-prompt',
    section: 'general',
    stage: 'gap-analysis',
    title: 'Find research gaps and contradictions',
    purpose: 'Check whether your research is strong enough to support a marketing decision.',
    placeholders: ['niche'],
    prompt: `Act as a critical research auditor. Review ALL the research findings I provide about {niche}.

Do not try to make my research look complete. Your job is to identify weaknesses, missing evidence, conflicting observations and assumptions.

Use only the supplied findings. Do not invent evidence or fill gaps using general knowledge. Reference finding IDs or titles when discussing specific evidence. Label interpretations and hypotheses clearly.

Return this Markdown report:

## 1. Research Coverage
Summarise which research areas are covered: market, customers, customer language, pain, triggers, competitors, advertising, products, keywords and current solutions.

## 2. Strong Evidence
Identify conclusions that have multiple relevant supporting findings.

## 3. Weak Evidence
Identify conclusions based on isolated, vague or indirect observations.

## 4. Contradictions
Show conflicting findings and explain why they matter.

## 5. Missing Evidence
Identify important research questions that remain unanswered.

## 6. Unsupported Assumptions
List statements that the available evidence does not justify.

## 7. Research Bias
Identify possible sampling limitations, such as relying on one platform, one competitor or one type of customer.

## 8. Five Highest-Priority Research Tasks
Rank the next five actions by how much uncertainty they could remove.

## 9. Decision Readiness
State whether the evidence is insufficient, preliminary or reasonably supportive of a small test. Explain the limitations.

Do not confuse a lack of evidence with evidence that something does not exist.

RESEARCH FINDINGS:
[Paste findings from all relevant sections here]`,
    good_looks_like:
      'You know what is well supported, what is still an assumption, which findings conflict and what to investigate before committing resources.',
  },
  {
    id: 'ai-angle-and-cheapest-test',
    kind: 'ai-prompt',
    section: 'general',
    stage: 'testing',
    title: 'Develop and test marketing angles',
    purpose: 'Turn documented customer problems and market evidence into testable marketing angles.',
    placeholders: ['niche', 'audience'],
    prompt: `Act as a critical direct-response marketing research strategist. Help me develop and test marketing angles for {niche}, targeting {audience}.

I will provide findings from market research, customers, competitors, advertising, products, keywords and general observations.

Use only the supplied findings as evidence. Do not invent customer quotations, demand, statistics, competitor weaknesses, prices or performance results. Separate observed facts from interpretations and new hypotheses. Cite finding IDs or titles for each proposed angle.

Return this Markdown report:

## 1. Evidence Summary
Identify the strongest documented customer problems, desires, triggers, objections and existing solutions.

## 2. Audience and Problem
Describe the most clearly supported audience and the specific problem worth addressing. Identify any uncertainty about the audience.

## 3. Customer Language
Extract up to five useful verbatim phrases from the findings. Preserve the original wording.

## 4. Marketing Angle Hypotheses
Develop five distinct angles. For each provide:
- Target audience
- Problem or desire
- Core promise
- Reason the angle may matter
- Supporting finding IDs or titles
- Main untested assumption

Do not present any proposed promise as a proven result.

## 5. Competitor Differentiation
Explain how the angles relate to documented competitor offers and claims. Do not invent differentiation.

## 6. Objections and Risks
Identify objections each angle may face and any claims that would require proof.

## 7. Cheapest Test
Recommend the cheapest realistic way to test each angle. Consider an organic post, WhatsApp status, direct customer question, simple landing page or small advertising test where appropriate.

## 8. Test Design
For the strongest angle, specify:
- What to test
- Who to show it to
- The exact message or creative concept
- Where to test it
- What response to measure
- What would count as encouraging evidence
- What would count as weak or negative evidence
- What decision to make next

Do not invent numerical success thresholds. Explain how I should choose a threshold based on my available audience, budget and test conditions.

## 9. Final Recommendation
Select the angle that is most justified by the supplied evidence, or explicitly state that none is sufficiently supported yet.

RESEARCH FINDINGS:
[Paste all relevant findings here]`,
    good_looks_like:
      'You have several distinct, evidence-linked angle hypotheses and a practical low-cost experiment for the strongest one, without mistaking AI ideas for proven demand.',
  },
]

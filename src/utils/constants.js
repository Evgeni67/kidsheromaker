// data/heroPrompts.bgTop14.js
// ESM export of prompts keyed by hero `key`
// Style: two-panel split (left: strict 1‑bit line art; right: flat color with identical outlines)

export const HERO_PROMPTS = {
  deadpool: `Use the input photo as identity. Transform the child into an age-appropriate red-and-black trickster hero inspired by Deadpool, while keeping it wholesome and brand-neutral. Preserve facial structure, eyes, and a playful expression. Face stays fully visible — use only a simple open eye-mask (no full hood), and absolutely no weapons.

COMPOSITION:
• One canvas split vertically into two equal panels (50/50) with a thin white gutter.
• Duplicate the same full-body figure (head to toe) in both panels with identical pose and framing.
• Neutral friendly stance (no action/combat).

LEFT PANEL — LINE ART ONLY (STRICT):
• Pure black outlines (#000000) on pure white (#FFFFFF) background.
• Interiors of suit, gloves, boots, belt, skin, and hair remain unfilled white.
• No color, no gray, no shading, no gradients, no halftones, no textures, no flat fills.
• Bold uniform lines (~2–4 px at 1024 px), closed contours, crisp and gap-free.

RIGHT PANEL — FLAT COLOR WITH IDENTICAL OUTLINES:
• Reuse the exact same outline layer (pixel-aligned); keep black outlines on top.
• Flat fills only: vivid red suit panels, black suit panels/accents, simple silver belt buckle, natural skin and hair tones.
• Background remains pure white. No gradients, no textures, no glow effects.

GLOBAL:
• Child-appropriate; identity preserved; no logos, no trademark text; no weapons; no full face mask or hood.`,

  wolverine: `Use the input photo as identity. Transform the child into an age-appropriate claw-themed hero inspired by Wolverine, but strictly child-safe and brand-neutral. Preserve facial structure, eyes, and a confident expression. No cowl with ears; no metal claws — represent the theme with three black chevrons on each glove.

COSTUME:
• Yellow bodysuit with blue shoulder/hip panels and gloves/boots.
• Black chevrons on gloves (as motif only), black belt accents.
• Face fully visible; optional simple black eye-mask outline.

COMPOSITION:
• Two equal vertical panels (50/50) with a thin white gutter; duplicate the same full-body figure in both.

LEFT — LINE ART ONLY:
• Only black outlines on white; all interiors unfilled.
• No gray/shading/gradients/halftones/textures.
• Bold uniform lines (~2–4 px), closed, crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse the same outline layer (pixel-aligned).
• Flat fills: yellow suit base, blue panels/gloves/boots, black belt/chevrons, natural skin/hair.
• White background only.

GLOBAL:
• Child-appropriate; identity preserved; no weapons; no logos/text.`,

  "spider-man": `Use the input photo as identity. Transform the child into an age-appropriate spider-themed hero (red-and-blue suit with black web-line pattern), brand-neutral. Preserve facial structure, eyes, and a friendly expression. Use only an open eye-mask; no full hood; generic chest shape (no spider logo).

COMPOSITION:
• One canvas split 50/50 with a thin white gutter; same full-body figure duplicated in both panels.

LEFT — HARD 1‑BIT LINE ART:
• Exactly two colors: black outlines on white background; interiors unfilled.
• Web lines allowed only as black linework; no fills, no gray, no shading, no textures.
• Bold lines (~2–4 px), closed and crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse the identical outline layer (pixel-aligned).
• Flat fills: vivid red suit areas, deep blue suit areas, white eye shapes, black web lines; natural skin/hair if visible.
• Background pure white; no gradients/halftones.

GLOBAL:
• Child-appropriate; identity preserved; no logos or trademark text.`,

  "venom": `Use the input photo as identity. Transform the child into a child-safe symbiote-inspired hero (black suit with bold white patches and eye shapes), brand-neutral. Preserve facial structure and a friendly smile. Prohibit monstrous teeth, tongue, drool, or scary features. No logos/spider emblem.

COMPOSITION:
• Two equal vertical panels (50/50) with a thin white gutter; same full-body figure duplicated.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled.
• No gray/shading/gradients/halftones/textures.
• Bold closed linework (~2–4 px), gap-free.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse the same pixel-aligned outlines.
• Flat fills: deep black suit, simple white chest/eye patches (abstract shapes), natural skin/hair tones.
• White background.

GLOBAL:
• Child-appropriate; identity preserved; friendly styling; no logos; no scary elements.`,

  "black-panther": `Use the input photo as identity. Transform the child into an age-appropriate panther-themed hero in a sleek black suit with silver accents, brand-neutral. Preserve the face (no full mask). Optional simple triangular necklace pattern; no logos.

COMPOSITION:
• Two equal vertical panels (50/50) with thin white gutter; same full-body figure duplicated.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold (~2–4 px), closed, crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse identical pixel-aligned outlines.
• Flat fills: matte black suit, silver-gray accents/neck triangles, natural skin/hair.
• Background pure white.

GLOBAL:
• Child-appropriate; identity preserved; no weapons; no trademark text/logos.`,

  "thor": `Use the input photo as identity. Transform the child into an age-appropriate thunder-themed hero inspired by Thor, brand-neutral. Face visible (no helmet). No hammer/weapon. Preserve identity and a kind heroic stance.

COSTUME:
• Dark suit with two or four simple silver circles on the chest.
• Red cape; silver-gray wrist bracers; black boots.
• Simple round belt buckle; no logos.

COMPOSITION:
• Canvas split 50/50 with thin white gutter; identical full-body figure in both panels.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold (~2–4 px), closed.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Same outline layer reused (pixel-aligned).
• Flat fills: dark navy/charcoal suit, red cape, silver circles/bracers/buckle, black boots, natural skin/hair.
• Background white.

GLOBAL:
• Child-appropriate; identity preserved; no weapons; no logos/text.`,

  "star-lord": `Use the input photo as identity. Transform the child into an age-appropriate space adventurer inspired by Star‑Lord, brand-neutral. Preserve the face (no helmet). No blasters/props.

COSTUME:
• Maroon jacket with simple paneling; dark pants; gray shirt.
• Small cassette-shaped patch allowed as abstract rectangle (no text/logo).

COMPOSITION:
• Two vertical panels (50/50) with thin white gutter; same full-body figure duplicated.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold closed lines (~2–4 px).

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse identical pixel-aligned outlines.
• Flat fills: maroon jacket, dark gray pants, medium gray shirt, black boots, natural skin/hair.
• Background white.

GLOBAL:
• Child-appropriate; identity preserved; no weapons; no logos/trademark text.`,

  "doctor-strange": `Use the input photo as identity. Transform the child into an age-appropriate mystic hero inspired by Doctor Strange, brand-neutral. Preserve the face; no magical effects/sigils.

COSTUME:
• Blue tunic with sash/belt; flowing red cape; dark pants/boots.
• Simple round medallion (plain circle) on chest — no symbol.

COMPOSITION:
• Split 50/50 canvas with thin white gutter; identical full-body figure in both panels.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold, closed, crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse pixel-aligned outlines.
• Flat fills: blue tunic, red cape, dark pants/boots, plain gold medallion circle, natural skin/hair.
• Background white.

GLOBAL:
• Child-appropriate; identity preserved; no logos or text; no magic VFX.`,

  "iron-man": `Use the input photo as identity. Transform the child into an age-appropriate tech-armored hero inspired by Iron Man, brand-neutral. Face stays visible (no closed helmet). Preserve identity.

COSTUME:
• Red armor plates with gold accents on shoulders/legs.
• Large circular chest element (plain glowing circle), simple palm circles.
• No logos, no text, no complex mechanical greebles.

COMPOSITION:
• Two equal vertical panels (50/50) with thin white gutter; same full-body figure duplicated.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; no gray/shading/gradients.
• Bold closed lines (~2–4 px), crisp, gap-free.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse identical pixel-aligned outlines.
• Flat fills: red armor, gold accents, white chest/palm circles, natural skin/hair.
• Background white.

GLOBAL:
• Child-appropriate; identity preserved; no weapons; no logos/trademark text; no full helmet.`,

  "miles-morales": `Use the input photo as identity. Transform the child into an age-appropriate spider-hero inspired by Miles Morales. Preserve the face — use only an open eye-mask (no full hood). No logos.

COSTUME:
• Black suit base with red web-line pattern and red panels on chest/shoulders.
• Red gloves and boots.

COMPOSITION:
• Split 50/50; thin white gutter; same full-body figure duplicated.

LEFT — STRICT 1‑BIT LINE ART:
• Black outlines on white; interiors unfilled; web lines allowed as outlines only.
• No gray/gradients/shading/textures.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse pixel-aligned outlines.
• Flat fills: black suit base, red web lines/panels, white eye shapes, natural skin/hair if visible.
• White background.

GLOBAL:
• Child-appropriate; identity preserved; no logos or text.`,

  "captain-america": `Use the input photo as identity. Transform the child into an age-appropriate patriotic hero inspired by Captain America, brand-neutral. Preserve face; friendly stance. A round shield (plain, stylized) is allowed as the single prop.

SHIELD (keep generic):
• Perfect circle with three concentric rings (outer red, middle white, inner red) and a center blue circle with a plain white star — geometric shapes only, no text.
• The same shield must appear in BOTH panels, identical pose and placement (left hand).

COSTUME:
• Blue top with a plain white star shape on chest; red-and-white striped torso panel; blue pants; red gloves and boots; brown belt.

COMPOSITION:
• Split 50/50 canvas with thin white gutter; same full-body figure duplicated.

LEFT — STRICT LINE ART ONLY:
• Only black outlines on white; interiors unfilled (including shield).
• No gray/shading/gradients/halftones/textures.
• Bold closed lines (~2–4 px), crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse the same pixel-aligned outline layer.
• Flat fills: vivid blue suit, red gloves/boots, red‑white torso stripes, brown belt; shield colored per spec above.
• Background pure white; no gradients.

GLOBAL:
• Child-appropriate; identity preserved; no logos/trademark text beyond generic shapes.`,

  "hulk": `Use the input photo as identity. Transform the child into an age-appropriate strong green hero inspired by Hulk, brand-neutral. Preserve facial structure and a friendly expression (not angry or roaring). No logos.

COSTUME/LOOK:
• Muscular silhouette (stylized), green skin, short dark hair, simple purple shorts.

COMPOSITION:
• Two equal vertical panels (50/50) with thin white gutter; duplicate the same full-body figure.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold, closed, crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse identical pixel-aligned outlines.
• Flat fills: medium green skin, purple shorts, dark hair; background white.

GLOBAL:
• Child-appropriate; identity preserved; no destruction/violence; no logos/text.`,

  "loki": `Use the input photo as identity. Transform the child into an age-appropriate mischief-themed hero inspired by Loki, brand-neutral. Preserve the face; no horned helmet; no weapons/scepter.

COSTUME:
• Green suit with gold trim; optional short green cape; simple gold headband (plain band, no horns).

COMPOSITION:
• Split 50/50 with thin white gutter; identical full-body figure duplicated.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold, closed lines.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse pixel-aligned outlines.
• Flat fills: rich green suit/cape, gold trims/headband, black boots, natural skin/hair; white background.

GLOBAL:
• Child-appropriate; identity preserved; no logos/trademark text.`,

  "ant-man": `Use the input photo as identity. Transform the child into an age-appropriate size-shifting hero inspired by Ant‑Man, brand-neutral. Preserve the face — no helmet/visor.

COSTUME:
• Red‑and‑black bodysuit with simple paneling; silver-gray belt and wrist cuffs; optional tiny silver circular chest detail.

COMPOSITION:
• Vertical 50/50 split with thin white gutter; same full-body figure duplicated in both panels.

LEFT — LINE ART ONLY:
• Black outlines on white; interiors unfilled; bold (~2–4 px), closed, crisp.

RIGHT — FLAT COLOR (IDENTICAL OUTLINES):
• Reuse the identical pixel-aligned outline layer.
• Flat fills: red suit panels, black suit panels, silver-gray belt/cuffs, natural skin/hair; white background.

GLOBAL:
• Child-appropriate; identity preserved; no logos/text; no helmets/visors.`,
};

export default HERO_PROMPTS;

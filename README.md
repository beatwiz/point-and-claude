![Point & Claude](hero.jpg)

# Point & Claude: A Handy Tool That Probably No One Asked For

Working with Claude Code and UI from the terminal? Sometimes you just need to point at something on the page and tell it "that one."

## Point and Pray

Yes, I know. Claude Code desktop has preview mode with point-and-click, Figma has Make, and half the AI tools out there have some version of this. This has probably been solved already. I couldn't be bothered to search. So I (we) built one.

This is for the terminal addicts. If you live in the CLI version of Claude Code, no desktop app, no IDE extension, just a terminal and a browser side by side, you've probably hit this: you're staring at a button in your browser, and you need Claude to modify it. But how do you *tell* Claude which button?

Enter **Point & Claude**, a Chrome extension that turns your browser into an element picker optimized for AI coding agents. Toggle it on, hover over any element, click it, and get LLM-friendly metadata copied to your clipboard, ready to paste directly into Claude Code (we have to do something, right?).

The output looks like this:

```
Page: https://myapp.com/dashboard
Title: Dashboard - MyApp

Selector: `#save-btn`
Path: `main > form.settings > button#save-btn`
Tag: button
Text: "Save Changes"
Aria: "Save changes"
Attributes: type="submit"
HTML: `<button id="save-btn" class="btn primary" type="submit">Save Changes</button>`
Rect: 120x40 at (350, 200)
```

Paste that into Claude Code, and there's zero ambiguity. Claude knows the page URL, the exact selector, the DOM path, the accessible name, the visible text, and even the element's position on screen. It can target that element on the first try.

## Teknolodja

The whole thing was built in a single Claude Code session. I described what I wanted in natural language, Claude generated all four files. One conversation.

Four files. No build step. No dependencies.

```
point-and-claude/
├── manifest.json    ← Manifest V3, permissions
├── background.js    ← Service worker: toggle, context menu, badge
├── content.js       ← Overlay, selection, info extraction
└── content.css      ← Monochromatic styles
```

The entire extension. No node_modules required.

Toggle it with the extension icon or right-click context menu. Press **Escape** to deactivate. The badge shows "ON" when active and auto-clears on navigation.

The overlay is nearly invisible. A 1px `#333` border, no border-radius, 2% opacity background. No gradients, no animations, no color. Just geometry. You can still see the page underneath perfectly.

When the picker is active, every mouse event gets intercepted in the capture phase. Links don't navigate, buttons don't submit, drag handlers don't fire. Scrolling still works because you need to explore the page to find your target.

The selector generator picks the most stable, readable selector it can find: IDs first, then `data-testid`, name attributes, aria labels, unique class combos, and a CSS path as last resort. Every selector gets checked for uniqueness before it's returned.

## Installation

No Chrome Web Store required. It's a developer tool.

1. Clone the repo: `git clone https://github.com/beatwiz/point-and-claude.git`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `point-and-claude` folder

That's it. Click the extension icon on any page to start picking elements.

It's a v0.0.0.1. Could add multi-select, framework detection, or pipe selections directly into Claude Code via MCP. But the four-file version already solves the core problem.

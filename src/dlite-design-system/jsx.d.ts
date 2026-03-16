/// <reference types="web-components-dlite/react" />

// Temporary types for dl-tabs/dl-tab until web-components-dlite 0.0.4 is published
declare namespace React.JSX {
  interface IntrinsicElements {
    'dl-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: string }, HTMLElement>;
    'dl-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; value?: string; active?: boolean; disabled?: boolean }, HTMLElement>;
  }
}

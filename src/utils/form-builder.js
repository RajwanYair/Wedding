/**
 * src/utils/form-builder.js — v7.5.0
 *
 * Programmatic form-field descriptor builder used by sections to
 * declare form schemas declaratively (instead of duplicating HTML).
 */

/**
 * @typedef {{ name: string, type: string, label: string, required?: boolean,
 *   options?: Array<{value: string, label: string}>, default?: unknown,
 *   max?: number, min?: number }} FieldDescriptor
 */

/**
 * Create a form schema builder.
 * @returns {{
 *   text: (name: string, label: string, opts?: Partial<FieldDescriptor>) => builder,
 *   number: (name: string, label: string, opts?: Partial<FieldDescriptor>) => builder,
 *   select: (name: string, label: string, options: Array<{value:string,label:string}>, opts?: Partial<FieldDescriptor>) => builder,
 *   checkbox: (name: string, label: string, opts?: Partial<FieldDescriptor>) => builder,
 *   phone: (name: string, label: string, opts?: Partial<FieldDescriptor>) => builder,
 *   build: () => FieldDescriptor[],
 * }} builder
 */
export function createFormSchema() {
  /** @type {FieldDescriptor[]} */
  const fields = [];

  const builder = {
    /** @param {string} name @param {string} label @param {Partial<FieldDescriptor>} [opts] */
    text(name, label, opts = {}) {
      fields.push({ name, label, type: "text", ...opts });
      return builder;
    },
    /** @param {string} name @param {string} label @param {Partial<FieldDescriptor>} [opts] */
    number(name, label, opts = {}) {
      fields.push({ name, label, type: "number", ...opts });
      return builder;
    },
    /**
     * @param {string} name
     * @param {string} label
     * @param {Array<{value:string,label:string}>} options
     * @param {Partial<FieldDescriptor>} [opts]
     */
    select(name, label, options, opts = {}) {
      fields.push({ name, label, type: "select", options, ...opts });
      return builder;
    },
    /** @param {string} name @param {string} label @param {Partial<FieldDescriptor>} [opts] */
    checkbox(name, label, opts = {}) {
      fields.push({ name, label, type: "checkbox", default: false, ...opts });
      return builder;
    },
    /** @param {string} name @param {string} label @param {Partial<FieldDescriptor>} [opts] */
    phone(name, label, opts = {}) {
      fields.push({ name, label, type: "phone", ...opts });
      return builder;
    },
    /** @returns {FieldDescriptor[]} */
    build() {
      return [...fields];
    },
  };

  return builder;
}

/**
 * Get required fields from a schema.
 * @param {FieldDescriptor[]} schema
 * @returns {string[]} field names
 */
export function getRequiredFields(schema) {
  return schema.filter((f) => f.required).map((f) => f.name);
}

/**
 * Validate form data against a schema.
 * Returns list of error messages (empty = valid).
 * @param {Record<string, unknown>} data
 * @param {FieldDescriptor[]} schema
 * @returns {string[]}
 */
export function validateFormData(data, schema) {
  const errors = [];
  for (const field of schema) {
    const val = data[field.name];
    if (field.required && (val === undefined || val === null || val === "")) {
      errors.push(`${field.label} is required`);
    }
    if (field.type === "number" && val !== undefined && val !== "") {
      const n = Number(val);
      if (!Number.isFinite(n)) {
        errors.push(`${field.label} must be a number`);
      } else {
        if (field.min !== undefined && n < field.min) {
          errors.push(`${field.label} must be at least ${field.min}`);
        }
        if (field.max !== undefined && n > field.max) {
          errors.push(`${field.label} must be at most ${field.max}`);
        }
      }
    }
    if (field.type === "select" && val !== undefined && field.options) {
      const valid = field.options.some((o) => o.value === val);
      if (!valid) errors.push(`${field.label} has an invalid value`);
    }
  }
  return errors;
}

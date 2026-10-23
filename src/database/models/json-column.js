import { DataTypes } from 'sequelize';

// JSON kept in a TEXT column: MariaDB returns its JSON type as a plain string, so parse/serialize here.
export const jsonColumn = (attribute, { field = attribute, allowNull = false } = {}) => ({
  type: DataTypes.TEXT,
  allowNull,
  field,
  get() {
    const raw = this.getDataValue(attribute);
    if (raw === null || raw === undefined) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  },
  set(value) {
    this.setDataValue(attribute, value === null || value === undefined ? null : JSON.stringify(value));
  }
});

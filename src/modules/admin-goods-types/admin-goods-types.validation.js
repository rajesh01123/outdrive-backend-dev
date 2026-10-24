import { validationError } from '../../middleware/validate.js';

const text = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const goodsTypeFields = (body, { creating }) => {
  if (creating || body.name !== undefined) {
    body.name = text(body.name);
    if (body.name.length < 2 || body.name.length > 60) validationError('name', 'name must be between 2 and 60 characters');
  }
  if (creating || body.status !== undefined) {
    body.status = text(body.status) || 'active';
    if (!['active', 'inactive'].includes(body.status)) validationError('status', 'status must be active or inactive');
  }
};

export const goodsTypeIdRequest = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) validationError('id', 'id must be a positive integer');
  req.params.id = id;
};

export const createGoodsTypeRequest = (req) => goodsTypeFields(req.body, { creating: true });

export const updateGoodsTypeRequest = (req) => {
  goodsTypeIdRequest(req);
  goodsTypeFields(req.body, { creating: false });
};

export const goodsTypeStatusRequest = (req) => {
  goodsTypeIdRequest(req);
  req.body.status = text(req.body.status);
  if (!['active', 'inactive'].includes(req.body.status)) validationError('status', 'status must be active or inactive');
};

export const reorderGoodsTypesRequest = (req) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) validationError('ids', 'ids must be a non-empty array of goods type ids');
  if (new Set(ids).size !== ids.length) validationError('ids', 'ids must not contain duplicates');
};

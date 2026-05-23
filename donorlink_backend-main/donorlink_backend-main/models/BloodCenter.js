import mongoose from 'mongoose';

const BloodCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    operatingHours: {
      monday: { open: { type: String }, close: { type: String } },
      tuesday: { open: { type: String }, close: { type: String } },
      wednesday: { open: { type: String }, close: { type: String } },
      thursday: { open: { type: String }, close: { type: String } },
      friday: { open: { type: String }, close: { type: String } },
      saturday: { open: { type: String }, close: { type: String } },
      sunday: { open: { type: String }, close: { type: String } },
    },
    currentDonorCount: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { versionKey: false, timestamps: true }
);

const BloodCenter = mongoose.model('BloodCenter', BloodCenterSchema);

export default BloodCenter;

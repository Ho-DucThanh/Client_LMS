import { baseApi } from "./api-base";

export interface CreateModuleDto {
  course_id: number;
  title: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateModuleDto extends Partial<CreateModuleDto> {}

export const moduleService = {
  async getModules(courseId?: number) {
    const qp = courseId ? `?course_id=${courseId}` : "";
    return baseApi.get(`/modules${qp}`);
  },
  async getModule(id: number) {
    return baseApi.get(`/modules/${id}`);
  },
  async createModule(data: CreateModuleDto) {
    return baseApi.post(`/modules`, data);
  },
  async updateModule(id: number, data: UpdateModuleDto) {
    return baseApi.patch(`/modules/${id}`, data);
  },
  async deleteModule(id: number) {
    return baseApi.delete(`/modules/${id}`);
  },
};

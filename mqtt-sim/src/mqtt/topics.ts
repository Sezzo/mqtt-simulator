export const topics = {
    cmd:       (ns: string, type: string, id: string) => `${ns}/${type}/${id}/set`,
    state:     (ns: string, type: string, id: string) => `${ns}/${type}/${id}/state`,
    status:    (ns: string, type: string, id: string) => `${ns}/${type}/${id}/status`,
    discovery: (ns: string, type: string, id: string) => `${ns}/discovery/${type}/${id}`,
};

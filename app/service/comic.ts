import { Service } from 'egg';
import {
    categoryLookup,
    authorLookup,
    countAll,
    selectCount,
    listAll,
    rateLookup,
    seasonLookup,
} from '../utils/aggregation';

class ComicService extends Service {
    async query({ page, size, sortBy, sortOrder, title, status, update, area, year, kind, tag }) {
        const mongoose = this.app.mongoose;
        const skip: number = (page - 1) * size;
        const limit: number = size;

        const query: any = {};
        title && (query.title = { $regex: title, $options: '$i' });
        status && (query.status = status);
        update && (query.isUpdate = update);
        area && (query.area = { $in: [mongoose.Types.ObjectId(area)] });
        year && (query.year = { $in: [mongoose.Types.ObjectId(year)] });
        kind && (query.kind = { $in: [mongoose.Types.ObjectId(kind)] });
        tag && (query.tag = { $in: [mongoose.Types.ObjectId(tag)] });

        const result = await this.ctx.model.Comic.aggregate([
            { $match: query },
            ...selectCount(sortBy).select,
            {
                $sort: {
                    [sortBy]: sortOrder,
                    _id: 1,
                },
            },
            { $skip: skip },
            { $limit: limit },
            ...categoryLookup,
            ...selectCount(sortBy).rest,
            authorLookup,
            countAll,
            {
                $project: {
                    listComment: 0,
                    listPlay: 0,
                    listDanmu: 0,
                    listEposide: 0,
                    listLike: 0,
                },
            },
        ]);

        const total = await this.ctx.model.Comic.find(query).countDocuments();

        return {
            list: result,
            total,
        };
    }

    async info(id: string) {
        const mongoose = this.app.mongoose;
        const result = await this.ctx.model.Animate.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                },
            },
            ...categoryLookup,
            ...Object.values(listAll),
            ...rateLookup,
            authorLookup,
            seasonLookup('comic'),
            countAll,
            {
                $project: {
                    listComment: 0,
                    listPlay: 0,
                    listDanmu: 0,
                    listEposide: 0,
                    listLike: 0,
                },
            },
        ]);
        return result.length > 0 ? result[0] : 13001;
    }

    async create(data: any) {
        const result = await this.ctx.model.Comic.create(data);
        return result;
    }

    async import(data: any) {
        const result = await this.create(data);

        const { eposide = [] } = data;

        eposide.map((item) => {
            item.target = result._id;
            item.onModel = 'Comic';
        });

        const eposideData = await this.ctx.service.eposide.create(eposide);

        return eposideData;
    }

    async update(ids: string[], data: any) {
        const query = ids.length > 0 ? { _id: { $in: ids } } : {};
        const result = await this.ctx.model.Comic.updateMany(query, { $set: data });
        return result;
    }

    async destroy(ids: string[]) {
        const query = ids.length > 0 ? { _id: { $in: ids } } : {};
        const result = await this.ctx.model.Comic.deleteMany(query);
        return result;
    }
}

export default ComicService;

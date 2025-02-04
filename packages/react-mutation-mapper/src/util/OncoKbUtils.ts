import _ from 'lodash';
import {
    generateQueryVariantId,
    IOncoKbData,
    LEVELS,
    Mutation,
    OncoKbCardDataType,
} from 'cbioportal-utils';
import { IndicatorQueryResp, TumorType } from 'oncokb-ts-api-client';
import {
    deriveStructuralVariantType,
    generateAnnotateStructuralVariantQuery,
    generateQueryStructuralVariantId,
} from 'cbioportal-utils';
import { StructuralVariant } from 'cbioportal-ts-api-client';

// oncogenic value => oncogenic class name
const ONCOGENIC_CLASS_NAMES: { [oncogenic: string]: string } = {
    'Likely Neutral': 'neutral',
    Unknown: 'unknown',
    Inconclusive: 'inconclusive',
    Resistance: 'oncogenic',
    'Likely Oncogenic': 'oncogenic',
    Oncogenic: 'oncogenic',
};

// oncogenic value => score
// (used for sorting purposes)
const ONCOGENIC_SCORE: { [oncogenic: string]: number } = {
    Unknown: 0,
    Inconclusive: 0,
    'Likely Neutral': 0,
    Resistance: 5,
    'Likely Oncogenic': 5,
    Oncogenic: 5,
};

// sensitivity level => score
// (used for sorting purposes)
const SENSITIVITY_LEVEL_SCORE: { [level: string]: number } = {
    '4': 1,
    '3B': 2,
    '3A': 3,
    '2': 5,
    '1': 6,
};

// resistance level <-> score
// (used for sorting purposes)
const RESISTANCE_LEVEL_SCORE: { [level: string]: number } = {
    R3: 1,
    R2: 2,
    R1: 3,
};

// diagnostic level <-> score
// (used for sorting purposes)
const DIAGNOSTIC_LEVEL_SCORE: { [level: string]: number } = {
    Dx3: 1,
    Dx2: 2,
    Dx1: 3,
};

// prognostic level <-> score
// (used for sorting purposes)
const PROGNOSTIC_LEVEL_SCORE: { [level: string]: number } = {
    Px3: 1,
    Px2: 2,
    Px1: 3,
};

export function normalizeLevel(level: string | null): string | null {
    if (level) {
        const matchArray = level.match(/LEVEL_(.*)/);

        if (matchArray && matchArray.length >= 2) {
            return matchArray[1];
        } else {
            return level;
        }
    } else {
        return null;
    }
}

export function normalizeOncogenicity(oncogenicity?: string) {
    return (oncogenicity || 'unknown')
        .trim()
        .toLowerCase()
        .replace(/\s/, '-');
}

export function oncogenicXPosition(highestSensitiveLevel: string | null) {
    const map: { [id: string]: number } = {
        '1': 1,
        '2': 2,
        '3A': 4,
        '3B': 5,
        '4': 6,
    };

    let levelIndex =
        highestSensitiveLevel === null ? 0 : map[highestSensitiveLevel] || 0;
    return -(8 + levelIndex * 30);
}

export function oncogenicYPosition(
    oncogenicity: string,
    isVUS: boolean,
    resistanceLevel: string | null
) {
    const oncogenicityMap: { [id: string]: number } = {
        Oncogenic: 0,
        'Likely Oncogenic': 0,
        Resistance: 0,
        Neutral: 1,
        'Likely Neutral': 1,
        Unknown: 2,
        Inconclusive: 2,
    };
    const resistanceLevelMap: { [id: string]: number } = {
        R1: 1,
        R2: 2,
        R3: 3,
    };

    let oncogenicityIndex = oncogenicityMap[oncogenicity];
    if (oncogenicityIndex === undefined) {
        oncogenicityIndex = 4;
    }
    if (oncogenicityIndex > 1 && isVUS) {
        oncogenicityIndex = 3;
    }

    const defaultIndexForUnrecognizedResistanceLevel = 0;
    let resistanceLevelIndex =
        resistanceLevel === null
            ? defaultIndexForUnrecognizedResistanceLevel
            : resistanceLevelMap[resistanceLevel] ||
              defaultIndexForUnrecognizedResistanceLevel;
    return -(7 + oncogenicityIndex * 120 + resistanceLevelIndex * 30);
}

export function levelIconClassNames(level: string) {
    if (level) {
        return `oncokb icon level-${level}`;
    }
    return '';
}

export function oncogenicityIconClassNames(oncogenicity: string) {
    return `oncokb icon ${normalizeOncogenicity(oncogenicity)}`;
}

export function annotationIconClassNames(
    type: OncoKbCardDataType,
    highestLevel: string,
    indicator?: IndicatorQueryResp
) {
    return type === OncoKbCardDataType.BIOLOGICAL
        ? oncogenicityIconClassNames(indicator?.oncogenic || '')
        : levelIconClassNames(normalizeLevel(highestLevel) || '');
}

export function calcHighestIndicatorLevel(
    type: OncoKbCardDataType,
    indicator?: IndicatorQueryResp
) {
    let highestLevel = '';

    if (indicator) {
        switch (type) {
            case OncoKbCardDataType.TXS:
                highestLevel = indicator.highestSensitiveLevel;
                break;
            case OncoKbCardDataType.TXR:
                highestLevel = indicator.highestResistanceLevel;
                break;
            case OncoKbCardDataType.DX:
                highestLevel = indicator.highestDiagnosticImplicationLevel;
                break;
            case OncoKbCardDataType.PX:
                highestLevel = indicator.highestPrognosticImplicationLevel;
                break;
        }
    }

    return highestLevel;
}

export function calcOncogenicScore(oncogenic: string) {
    return ONCOGENIC_SCORE[oncogenic] || 0;
}

export function calcSensitivityLevelScore(level: string) {
    return SENSITIVITY_LEVEL_SCORE[normalizeLevel(level) || ''] || 0;
}

export function calcResistanceLevelScore(level: string) {
    return RESISTANCE_LEVEL_SCORE[normalizeLevel(level) || ''] || 0;
}

export function calcDiagnosticLevelScore(level: string) {
    return DIAGNOSTIC_LEVEL_SCORE[normalizeLevel(level) || ''] || 0;
}

export function calcPrognosticLevelScore(level: string) {
    return PROGNOSTIC_LEVEL_SCORE[normalizeLevel(level) || ''] || 0;
}

export function generateOncogenicCitations(oncogenicRefs: any): number[] {
    return _.isArray(oncogenicRefs)
        ? _.map(oncogenicRefs, (article: any) => {
              return Number(article.pmid);
          }).sort()
        : [];
}

export function levelComparator(a: string, b: string) {
    return LEVELS.all.indexOf(a) > LEVELS.all.indexOf(b) ? -1 : 1;
}

function getLevel(level: string) {
    if (level) {
        var _level = level.match(/LEVEL_(R?\d[AB]?)/);
        if (_level instanceof Array && _level.length >= 2) {
            return _level[1];
        } else {
            return level;
        }
    } else {
        return '';
    }
}

function treatmentsToStr(data: any[]) {
    if (_.isArray(data)) {
        var treatments: any[] = [];

        data.forEach(function(treatment: any) {
            treatments.push(drugToStr(treatment.drugs));
        });

        return treatments.sort().join(', ');
    } else {
        return '';
    }
}

function drugToStr(data: any) {
    var drugs: any[] = [];

    data.forEach(function(drug: any) {
        drugs.push(drug.drugName);
    });

    return drugs.sort().join(' + ');
}

/**
 * Return combined alterations name, separated by comma.
 * Same location variant will be truncated into AALocationAllele e.g. V600E/K
 *
 * @param {Array} alterations - List of alterations
 * @return {string} - Truncated alteration name
 */
export function mergeAlterations(alterations: string | string[]) {
    var positions: any = {};
    var regular: any[] = [];
    var regExp = new RegExp('^([A-Z])([0-9]+)([A-Z]$)');

    if (_.isString(alterations)) {
        return alterations;
    }

    _.each(alterations, function(alteration) {
        var result = regExp.exec(alteration);
        if (_.isArray(result) && result.length === 4) {
            if (!positions.hasOwnProperty(result[2])) {
                positions[result[2]] = {};
            }
            if (!positions[result[2]].hasOwnProperty(result[1])) {
                // Avoid duplication, use object instead of array
                positions[result[2]][result[1]] = {};
            }
            positions[result[2]][result[1]][result[3]] = 1;
        } else {
            regular.push(alteration);
        }
    });

    _.each(
        _.keys(positions)
            .map(function(e) {
                return Number(e);
            })
            .sort(),
        function(position) {
            _.each(_.keys(positions[position]).sort(), function(aa) {
                regular.push(
                    aa +
                        position +
                        _.keys(positions[position][aa])
                            .sort()
                            .join('/')
                );
            });
        }
    );
    return regular.join(', ');
}

/**
 * Return the positional variant of the missense mutation
 * @param alteration The missense mutation
 */
export function getPositionalVariant(alteration: string) {
    const regExp = new RegExp('^([A-Z]+)([0-9]+)([A-Z]*)$');
    const result = regExp.exec(alteration);

    // Only if the alteration is missense mutation or positional variant
    // result[0]: matched alteration
    // result[1]: reference alleles (there could be multiple reference alleles, we only return the first allele)
    // result[2]: position(protein start/end)
    // result[3]: variant alleles (empty if the alteration is positional variant already)
    if (
        _.isArray(result) &&
        result.length === 4 &&
        (!result[3] || result[1].length === result[3].length)
    ) {
        return `${result[1][0]}${result[2]}`;
    }
    return undefined;
}

export function getTumorTypeName(tumorType?: TumorType) {
    if (!tumorType) {
        return '';
    } else if (tumorType.name) {
        return tumorType.name;
    } else if (tumorType.mainType) {
        return tumorType.mainType.name;
    } else {
        return '';
    }
}

export function getTumorTypeNameWithExclusionInfo(
    tumorType?: TumorType,
    excludedTumorTypes?: TumorType[]
) {
    let name = getTumorTypeName(tumorType);
    if (!_.isEmpty(excludedTumorTypes)) {
        name = `${name} (excluding ${excludedTumorTypes!
            .map(ett => getTumorTypeName(ett))
            .join(', ')})`;
    }
    return name;
}

export function groupOncoKbIndicatorDataByMutations(
    mutationsByPosition: { [pos: number]: Mutation[] },
    oncoKbData: IOncoKbData,
    getTumorType: (mutation: Mutation) => string,
    getEntrezGeneId: (mutation: Mutation) => number,
    filter?: (indicator: IndicatorQueryResp) => boolean
): { [pos: number]: IndicatorQueryResp[] } {
    const indicatorMap: { [pos: number]: IndicatorQueryResp[] } = {};

    _.keys(mutationsByPosition).forEach(key => {
        const position = Number(key);
        const indicators: IndicatorQueryResp[] = mutationsByPosition[position]
            .map(mutation =>
                getIndicatorData(
                    mutation,
                    oncoKbData,
                    getTumorType,
                    getEntrezGeneId
                )
            )
            .filter(
                indicator =>
                    indicator !== undefined && (!filter || filter(indicator))
            ) as IndicatorQueryResp[];

        if (position > 0 && indicators.length > 0) {
            indicatorMap[position] = indicators;
        }
    });

    return indicatorMap;
}

export function getIndicatorData(
    mutation: Mutation,
    oncoKbData: IOncoKbData,
    getTumorType: (mutation: Mutation) => string,
    getEntrezGeneId: (mutation: Mutation) => number
): IndicatorQueryResp | undefined {
    if (oncoKbData.indicatorMap === null) {
        return undefined;
    }

    let id = '';

    // @ts-ignore
    const sv: StructuralVariant = mutation.structuralVariant;

    if (sv) {
        let structuralVariantType = deriveStructuralVariantType(sv);
        id = generateQueryStructuralVariantId(
            sv.site1EntrezGeneId,
            sv.site2EntrezGeneId,
            getTumorType(mutation),
            structuralVariantType
        );
    } else {
        id = generateQueryVariantId(
            getEntrezGeneId(mutation),
            getTumorType(mutation),
            mutation.proteinChange,
            mutation.mutationType
        );
    }

    return oncoKbData.indicatorMap[id];
}

export function defaultOncoKbIndicatorFilter(indicator: IndicatorQueryResp) {
    return indicator.oncogenic
        .toLowerCase()
        .trim()
        .includes('oncogenic');
}

export function defaultOncoKbFilter(
    mutation: Mutation,
    oncoKbData?: IOncoKbData,
    getTumorType?: (mutation: Mutation) => string,
    getEntrezGeneId?: (mutation: Mutation) => number
): boolean {
    let filter = true;

    if (oncoKbData && getTumorType && getEntrezGeneId) {
        const indicatorData = getIndicatorData(
            mutation,
            oncoKbData,
            getTumorType,
            getEntrezGeneId
        );
        filter = indicatorData
            ? defaultOncoKbIndicatorFilter(indicatorData)
            : false;
    }

    return filter;
}

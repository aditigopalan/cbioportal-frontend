import * as React from 'react';
import _ from 'lodash';
import { observer } from 'mobx-react';
import { TypeOfCancer as CancerType } from 'cbioportal-ts-api-client';
import Testimonials from '../testimonials/Testimonials';
import { getServerConfig } from 'config/config';
import { QueryStore } from 'shared/components/query/QueryStore';
import { Link } from 'react-router-dom';
import LoadingIndicator from '../loadingIndicator/LoadingIndicator';
import { buildCBioPortalPageUrl } from '../../api/urls';
import { ResultsViewTab } from '../../../pages/resultsView/ResultsViewPageHelpers';

interface IRightBarProps {
    queryStore: QueryStore;
}
interface IRightBarState {
    twitterLoading: boolean;
}

@observer
export default class RightBar extends React.Component<
    IRightBarProps,
    IRightBarState
> {
    constructor(props: IRightBarProps) {
        super(props);
        this.state = {
            twitterLoading: true, // only used for default what's new
        };
    }

    get studyStore() {
        return this.props.queryStore;
    }

    get logic() {
        return this.studyStore.studyListLogic;
    }

    private CancerTypeList() {
        return this.logic.cancerTypeListView.getChildCancerTypes(
            this.studyStore.treeData.rootCancerType,
            true
        );
    }

    private CancerTypeDescendantStudy({
        cancerType,
    }: {
        cancerType: CancerType;
    }) {
        return this.logic.cancerTypeListView.getDescendantCancerStudies(
            cancerType
        );
    }

    private CancerTypeDescendantStudies(cancerList: CancerType[]) {
        return cancerList
            .filter(
                cancer =>
                    cancer.cancerTypeId !== 'other' &&
                    cancer.cancerTypeId !== 'mixed'
            )
            .map((filteredCancer: CancerType) => ({
                shortName: filteredCancer.name,
                color: filteredCancer.dedicatedColor,
                studies: this.CancerTypeDescendantStudy({
                    cancerType: filteredCancer,
                }),
            }));
    }

    private getWhatsNew() {
        if (getServerConfig().skin_right_nav_show_whats_new) {
            if (!_.isEmpty(getServerConfig().skin_right_nav_whats_new_blurb)) {
                return (
                    <div className="rightBarSection">
                        <h3>What's New</h3>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: getServerConfig()
                                    .skin_right_nav_whats_new_blurb!,
                            }}
                        ></div>
                    </div>
                );
            } else {
                let Timeline = require('react-twitter-widgets').Timeline;
                return (
                    <div
                        className="rightBarSection"
                        style={{ paddingBottom: 20 }}
                    >
                        <h3 style={{ borderBottom: 0 }}>
                            What's New
                            <a
                                href="http://www.twitter.com/cbioportal"
                                className="pull-right"
                            >
                                @cbioportal{' '}
                                <i
                                    className="fa fa-twitter"
                                    aria-hidden="true"
                                ></i>
                            </a>
                        </h3>
                        {
                            // TODO this is a temporary workaround to limit the vertical size of the Timeline container
                            //  ideally this should be fixed within the corresponding react component
                            //  we should revisit this once there is a newer and properly working version of the library
                            //  another alternative is to directly use the twitter generated code
                            //  (https://publish.twitter.com/?maxheight=200&query=%40cbioportal&widget=Timeline)
                            //  but then we lose the "onLoad" functionality
                        }
                        <div
                            style={{
                                marginTop: 3,
                                maxHeight: 200,
                                overflowY: 'scroll',
                            }}
                        >
                            <Timeline
                                dataSource={{
                                    sourceType: 'profile',
                                    screenName: 'cbioportal',
                                }}
                                options={{
                                    username: 'cbioportal',
                                    // TODO height option does not seem to work anymore
                                    //  (see the workaround and comments above)
                                    height: '200',
                                    chrome: 'noheader%20nofooter',
                                }}
                                onLoad={() =>
                                    this.setState({ twitterLoading: false })
                                }
                            />
                        </div>
                        <div>
                            {(this.state.twitterLoading && (
                                <span style={{ textAlign: 'center' }}>
                                    <LoadingIndicator
                                        isLoading={true}
                                        small={true}
                                    />
                                </span>
                            )) || (
                                <div style={{ paddingTop: 5 }}>
                                    <p style={{ textAlign: 'center' }}>
                                        Sign up for low-volume email news alerts
                                    </p>
                                    <a
                                        target="_blank"
                                        className="btn btn-default btn-sm"
                                        href="http://groups.google.com/group/cbioportal-news/boxsubscribe"
                                        style={{ width: '100%' }}
                                    >
                                        Subscribe
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
        } else {
            return null;
        }
    }

    private getInstallationMap() {
        const installations_url = getServerConfig().installation_map_url;
        return !installations_url ? null : (
            <div className="rightBarSection">
                <h3 style={{ paddingBottom: 8 }}>
                    Local Installations{' '}
                    <a
                        className={'btn btn-link btn-xs pull-right'}
                        target={'_blank'}
                        href={buildCBioPortalPageUrl('/visualize')}
                    >
                        Host your own
                    </a>
                </h3>
                <a
                    href={buildCBioPortalPageUrl('/installations')}
                    target={'_blank'}
                    style={{ display: 'block' }}
                >
                    <iframe
                        frameBorder="0"
                        height={200}
                        width={300}
                        scrolling="no"
                        src={`${installations_url}?small=1`}
                        style={{ pointerEvents: 'none' }}
                    />
                </a>

                <p>
                    Are you running a local instance of cBioPortal, public or
                    private?{' '}
                    <a
                        target={'_blank'}
                        href="https://docs.google.com/forms/d/e/1FAIpQLSflQdN956q7Xh5caO8z8jIaF6uMLBkKrSxFvPi8OhNBWB247w/viewform"
                    >
                        Complete the survey here
                    </a>{' '}
                    to add your installation to the map.
                </p>
            </div>
        );
    }

    public getExampleSection() {
        if (getServerConfig().skin_right_nav_show_examples) {
            if (!_.isEmpty(getServerConfig().skin_examples_right_column_html)) {
                return (
                    <div
                        className="rightBarSection exampleQueries"
                        dangerouslySetInnerHTML={{
                            __html:
                                '<h3>Example Queries</h3>' +
                                getServerConfig()
                                    .skin_examples_right_column_html,
                        }}
                    ></div>
                );
            } else {
                return (
                    <div className="rightBarSection exampleQueries">
                        <h3>Example Queries</h3>
                        <ul>
                            <li>
                                <Link to="/comparison/mutations?sessionId=5cf89323e4b0ab413787436c">
                                    Primary vs. metastatic prostate cancer
                                </Link>
                            </li>
                            <li>
                                <Link to="/results?cancer_study_list=coadread_tcga_pub&cancer_study_id=coadread_tcga_pub&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=coadread_tcga_pub_mutations&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=coadread_tcga_pub_gistic&Z_SCORE_THRESHOLD=2.0&case_set_id=coadread_tcga_pub_nonhypermut&gene_list=KRAS+NRAS+BRAF&gene_set_choice=user-defined-list">
                                    RAS/RAF alterations in colorectal cancer
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={`/results/${ResultsViewTab.MUTATIONS}?cancer_study_list=ov_tcga_pub&cancer_study_id=ov_tcga_pub&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=ov_tcga_pub_mutations&Z_SCORE_THRESHOLD=2.0&case_set_id=ov_tcga_pub_3way_complete&gene_list=BRCA1+BRCA2&gene_set_choice=user-defined-list`}
                                >
                                    BRCA1 and BRCA2 mutations in ovarian cancer
                                </Link>
                            </li>
                            <li>
                                <Link to="/results?cancer_study_list=ucec_tcga_pub&cancer_study_id=ucec_tcga_pub&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=ucec_tcga_pub_mutations&Z_SCORE_THRESHOLD=2.0&RPPA_SCORE_THRESHOLD=2.0&data_priority=0&case_set_id=ucec_tcga_pub_sequenced&gene_set_choice=user-defined-list&gene_list=POLE%3A+MUT+%3D+P286+MUT+%3D+V411+MUT+%3D+L424+MUT+%3D+S297F&clinical_param_selection=null">
                                    POLE hotspot mutations in endometrial cancer
                                </Link>
                            </li>
                            <li>
                                <Link to="/results?case_set_id=gbm_tcga_pub_sequenced&Action=Submit&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=gbm_tcga_pub_mutations&genetic_profile_ids_PROFILE_COPY_NUMBER_ALTERATION=gbm_tcga_pub_cna_rae&Z_SCORE_THRESHOLD=1.0&cancer_study_list=gbm_tcga_pub&cancer_study_id=gbm_tcga_pub&gene_list=TP53+MDM2+MDM4&gene_set_choice=user-defined_list">
                                    TP53 and MDM2/4 alterations in GBM
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to={`/results/${ResultsViewTab.DOWNLOAD}?case_set_id=gbm_tcga_pub_sequenced&Action=Submit&genetic_profile_ids_PROFILE_MUTATION_EXTENDED=gbm_tcga_pub_mutations&cancer_study_list=gbm_tcga_pub&cancer_study_id=gbm_tcga_pub&gene_list=PTEN&gene_set_choice=user-defined_list&transpose_matrix=on`}
                                >
                                    PTEN mutations in GBM in text format
                                </Link>
                            </li>
                            <li>
                                <Link to="/patient?studyId=ucec_tcga_pub&caseId=TCGA-BK-A0CC">
                                    Patient view of an endometrial cancer case
                                </Link>
                            </li>
                            <li>
                                <Link to="/study?id=laml_tcga_pan_can_atlas_2018,acc_tcga_pan_can_atlas_2018,blca_tcga_pan_can_atlas_2018,lgg_tcga_pan_can_atlas_2018,brca_tcga_pan_can_atlas_2018,cesc_tcga_pan_can_atlas_2018,chol_tcga_pan_can_atlas_2018,coadread_tcga_pan_can_atlas_2018,dlbc_tcga_pan_can_atlas_2018,esca_tcga_pan_can_atlas_2018,gbm_tcga_pan_can_atlas_2018,hnsc_tcga_pan_can_atlas_2018,kich_tcga_pan_can_atlas_2018,kirc_tcga_pan_can_atlas_2018,kirp_tcga_pan_can_atlas_2018,lihc_tcga_pan_can_atlas_2018,luad_tcga_pan_can_atlas_2018,lusc_tcga_pan_can_atlas_2018,meso_tcga_pan_can_atlas_2018,ov_tcga_pan_can_atlas_2018,paad_tcga_pan_can_atlas_2018,pcpg_tcga_pan_can_atlas_2018,prad_tcga_pan_can_atlas_2018,sarc_tcga_pan_can_atlas_2018,skcm_tcga_pan_can_atlas_2018,stad_tcga_pan_can_atlas_2018,tgct_tcga_pan_can_atlas_2018,thym_tcga_pan_can_atlas_2018,thca_tcga_pan_can_atlas_2018,ucs_tcga_pan_can_atlas_2018,ucec_tcga_pan_can_atlas_2018,uvm_tcga_pan_can_atlas_2018">
                                    All TCGA Pan-Cancer
                                </Link>
                            </li>
                            <li>
                                <Link to="/study?id=msk_impact_2017">
                                    MSK-IMPACT clinical cohort, Zehir et al.
                                    2017
                                </Link>
                            </li>
                            <li>
                                <Link to="/study?id=5c26a970e4b05228701f9fa9">
                                    Histone mutations across cancer types
                                </Link>
                            </li>
                        </ul>
                    </div>
                );
            }
        }
        return null;
    }

    public getTestimonialsSection() {
        return getServerConfig().skin_right_nav_show_testimonials ? (
            <div className="rightBarSection" style={{ minHeight: '300px' }}>
                <h3>Testimonials</h3>
                <Testimonials />
            </div>
        ) : null;
    }

    render() {
        return (
            <div>
                {this.getWhatsNew()}
                {this.getExampleSection()}
                {this.getInstallationMap()}
                {this.getTestimonialsSection()}
            </div>
        );
    }
}

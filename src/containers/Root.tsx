import * as React from 'react';
import {connect} from 'react-redux';
import {Dispatch} from 'redux';

import * as css from './Root.css';
import Test from '../components/Test';

interface IRootProps {}

interface IRootState {}

class Root extends React.Component<IRootProps, IRootState> {
    public render() {
        return (
            <div className={css.root}>
                <Test />
            </div>
        );
    }
}

const mapStateToProps = (state: any) => {
    return state;
};

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
    return {};
};

export default connect<{}, {}, IRootProps>(
    mapStateToProps,
    mapDispatchToProps
)(Root);

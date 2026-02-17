import React from "react";
import { Handle, useNodeConnections } from "@xyflow/react";

const LimitHandle = (props) => {
    const connections = useNodeConnections({
        handleType: props.type,
    });

    return (
        <Handle
            {...props}
            isConnectable={connections.length < (props.connectioncount || 1)}
        />
    );
};

export default LimitHandle;
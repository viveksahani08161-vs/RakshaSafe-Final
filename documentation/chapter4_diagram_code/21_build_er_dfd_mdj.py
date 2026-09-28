# -*- coding: utf-8 -*-
"""Build REAL ER + DFD diagrams as polished, openable StarUML class diagrams
inside the existing .mdj project. A second model is (re-)appended:

  - ER Diagram   (15 collections, real attributes + real FK associations)
  - DFD Level 0  Context
  - DFD Level 1  User Domain
  - DFD Level 1  Admin Domain
  - DFD Level 2  SOS Creation (User)
  - DFD Level 2  Incident Administration (Admin)

Layout principle: every element is placed on a UNIFORM grid (aligned rows /
columns, no overlap), edges are routed as clean straight lines with labels at
midpoints. Content mirrors 20_real_er_dfd.py (real models + real routes).
Idempotent: an existing model with the same name is removed first.
"""
import json
import secrets

MDJ = r'C:\Users\SAI\Desktop\Raksha\documentation\staruml\Chapter_4_RakshaSafe_Activity_Diagrams.mdj'
MODEL_NAME = 'RakshaSafe - ER & DFD (real data)'

real = __import__('20_real_er_dfd')
ER_ENTITIES = real.ER_ENTITIES
ER_RELS = real.ER_RELS


def gid():
    return secrets.token_hex(16)


class Builder:
    def __init__(self, model_name, project_id):
        self.model_id = gid()
        self.project_id = project_id
        self.model = {
            '_type': 'UMLModel', '_id': self.model_id,
            '_parent': {'$ref': project_id},
            'name': model_name, 'ownedElements': [],
        }
        self.classes = {}

    def add_class(self, key, name, attrs, stereotype=None):
        cid = gid()
        attr_models = []
        for a in attrs:
            aid = gid()
            attr_models.append({
                '_type': 'UMLAttribute', '_id': aid,
                '_parent': {'$ref': cid},
                'name': a['text'], 'visibility': 'public', 'isStatic': False,
                'isReadOnly': False, 'type': 'String',
            })
        c = {
            '_type': 'UMLClass', '_id': cid,
            '_parent': {'$ref': self.model_id},
            'name': name, 'visibility': 'public',
            'attributes': [{'$ref': a['_id']} for a in attr_models],
            'ownedElements': attr_models,
        }
        if stereotype:
            c['stereotype'] = stereotype
        self.model['ownedElements'].append(c)
        self.model['ownedElements'].extend(attr_models)
        self.classes[key] = {'class': c, 'attrs': attr_models}
        return c

    def _assoc_model(self, name, src_key, dst_key, directional=True):
        aid = gid()
        a = {
            '_type': 'UMLAssociation', '_id': aid,
            '_parent': {'$ref': self.model_id},
            'name': name, 'visibility': 'public',
            'direction': 'Direction_Source_Destination' if directional else 'Direction_None',
            'end1': {
                '_type': 'UMLAssociationEnd', '_id': gid(),
                'name': '', 'visibility': 'public', 'aggregation': 'none',
                'isNavigable': False,
                'owner': {'$ref': self.classes[src_key]['class']['_id']},
                'type': {'$ref': self.classes[src_key]['class']['_id']},
            },
            'end2': {
                '_type': 'UMLAssociationEnd', '_id': gid(),
                'name': '', 'visibility': 'public', 'aggregation': 'none',
                'isNavigable': directional,
                'owner': {'$ref': self.classes[dst_key]['class']['_id']},
                'type': {'$ref': self.classes[dst_key]['class']['_id']},
            },
        }
        self.model['ownedElements'].append(a)
        return a

    def add_diagram(self, name, boxes, attrs, edges):
        did = gid()
        views = []
        for key, (l, t, w, h) in boxes.items():
            c = self.classes[key]['class']
            cl_attrs = self.classes[key]['attrs']
            cview, ncomp, acomp, ocomp = gid(), gid(), gid(), gid()
            name_lbl, stereo_lbl, prop_lbl = gid(), gid(), gid()
            attr_views = []
            for i, a in enumerate(cl_attrs):
                av, lbl = gid(), gid()
                row_text = attrs.get(key, [])[i] if key in attrs and i < len(attrs[key]) else (' ' + a['name'])
                attr_views.append({
                    '_type': 'UMLAttributeView', '_id': av,
                    '_parent': {'$ref': acomp},
                    'model': {'$ref': a['_id']},
                    'font': 'Arial;10;0',
                    'left': l + 8, 'top': t + 30 + i * 13, 'width': w - 16, 'height': 12,
                    'subViews': [{
                        '_type': 'LabelView', '_id': lbl,
                        '_parent': {'$ref': av},
                        'font': 'Arial;10;0',
                        'left': l + 8, 'top': t + 30 + i * 13, 'width': w - 16, 'height': 12,
                        'wordWrap': True, 'model': {'$ref': a['_id']},
                        'text': row_text,
                    }],
                })
            ncomp_obj = {
                '_type': 'UMLNameCompartmentView', '_id': ncomp,
                '_parent': {'$ref': cview},
                'model': {'$ref': c['_id']},
                'font': 'Arial;12;0',
                'left': l, 'top': t, 'width': w, 'height': 30,
                'subViews': [
                    {'_type': 'LabelView', '_id': name_lbl, '_parent': {'$ref': ncomp},
                     'font': 'Arial;12;1', 'left': l, 'top': t + 8, 'width': w,
                     'height': 14, 'wordWrap': True, 'model': {'$ref': c['_id']},
                     'text': c['name']},
                    {'_type': 'LabelView', '_id': stereo_lbl, '_parent': {'$ref': ncomp},
                     'font': 'Arial;10;0', 'left': l, 'top': t, 'width': w,
                     'height': 12, 'wordWrap': True, 'visible': False,
                     'model': {'$ref': c['_id']}},
                    {'_type': 'LabelView', '_id': prop_lbl, '_parent': {'$ref': ncomp},
                     'font': 'Arial;10;0', 'left': l, 'top': t + 13, 'width': w,
                     'height': 12, 'wordWrap': True, 'visible': False,
                     'model': {'$ref': c['_id']}},
                ],
                'stereotypeLabel': {'$ref': stereo_lbl},
                'nameLabel': {'$ref': name_lbl},
                'propertyLabel': {'$ref': prop_lbl},
            }
            top_attr = t + 30
            acomp_obj = {
                '_type': 'UMLAttributeCompartmentView', '_id': acomp,
                '_parent': {'$ref': cview},
                'model': {'$ref': c['_id']},
                'font': 'Arial;10;0',
                'left': l, 'top': top_attr, 'width': w,
                'height': len(cl_attrs) * 13,
                'subViews': attr_views,
            }
            ocomp_obj = {
                '_type': 'UMLOperationCompartmentView', '_id': ocomp,
                '_parent': {'$ref': cview},
                'model': {'$ref': c['_id']},
                'font': 'Arial;10;0',
                'left': l, 'top': top_attr + len(cl_attrs) * 13, 'width': w, 'height': 0,
                'subViews': [],
            }
            views.append({
                '_type': 'UMLClassView', '_id': cview,
                '_parent': {'$ref': did},
                'model': {'$ref': c['_id']},
                'font': 'Arial;12;0',
                'containerChangeable': True,
                'left': l, 'top': t, 'width': w, 'height': h,
                'subViews': [ncomp_obj, acomp_obj, ocomp_obj],
                'nameCompartment': {'$ref': ncomp},
                'wordWrap': True,
            })
        view_by_key = {}
        for key, (l, t, w, h) in boxes.items():
            c = self.classes[key]['class']
            view_by_key[key] = next(v for v in views
                                    if v['model']['$ref'] == c['_id'])
        for (s, d, lbl) in edges:
            assoc = self._assoc_model(lbl, s, d)
            sv = view_by_key[s]
            dv = view_by_key[d]
            av, namel, sterl, propl = gid(), gid(), gid(), gid()
            edge = {
                '_type': 'UMLAssociationView', '_id': av,
                '_parent': {'$ref': did},
                'model': {'$ref': assoc['_id']},
                'font': 'Arial;10;0',
                'head': {'$ref': dv['_id']},
                'tail': {'$ref': sv['_id']},
                'lineStyle': 1,
                'points': '%s:%s;%s:%s' % (sv['left'] + sv['width'] / 2, sv['top'] + sv['height'] / 2,
                                           dv['left'] + dv['width'] / 2, dv['top'] + dv['height'] / 2),
                'showVisibility': False,
                'nameLabel': {
                    '_type': 'EdgeLabelView', '_id': namel,
                    '_parent': {'$ref': av},
                    'model': {'$ref': assoc['_id']},
                    'visible': True, 'font': 'Arial;10;0',
                    'left': (sv['left'] + dv['left']) / 2,
                    'top': (sv['top'] + dv['top']) / 2,
                    'width': 14, 'height': 12,
                    'alpha': 1.5707963267948966, 'distance': 12,
                    'hostEdge': {'$ref': av},
                    'edgePosition': 1,
                    'text': lbl,
                },
                'stereotypeLabel': {'_type': 'EdgeLabelView', '_id': sterl,
                                    '_parent': {'$ref': av}, 'model': {'$ref': assoc['_id']},
                                    'visible': False, 'font': 'Arial;10;0', 'height': 12,
                                    'hostEdge': {'$ref': av}, 'edgePosition': 1},
                'propertyLabel': {'_type': 'EdgeLabelView', '_id': propl,
                                  '_parent': {'$ref': av}, 'model': {'$ref': assoc['_id']},
                                  'visible': False, 'font': 'Arial;10;0', 'height': 12,
                                  'hostEdge': {'$ref': av}, 'edgePosition': 1},
            }
            views.append(edge)
        diag = {
            '_type': 'UMLClassDiagram', '_id': did,
            '_parent': {'$ref': self.model_id},
            'name': name,
            'ownedViews': views,
        }
        self.model['ownedElements'].append(diag)


# ---------------------------------------------------------- ER ---------------
def er_attr_texts(fields):
    return [' ' + (('PK ' if 'PK' in n else '') + ('UQ ' if 'UQ' in n else '') + f)
            for f, n in fields]


ER_GRID = {
    'Users': (0, 0), 'Reports': (1, 0), 'Locations': (0, 1), 'DisasterCategories': (1, 2),
    'Incidents': (0, 2), 'EmergencyContacts': (1, 1), 'Facilities': (0, 3),
    'RescueTeams': (1, 3), 'RiskZones': (0, 4), 'RescueAssignments': (1, 4),
    'UnsafeAreaReports': (2, 1), 'AdminLogs': (2, 4), 'Notifications': (2, 3),
    'RiskAssessments': (2, 0), 'IncidentUpdates': (2, 2),
}


def build_er(b):
    sizes = {}
    attr_text = {}
    for name, fields in ER_ENTITIES:
        b.add_class('E_' + name, name + ' («Entity»)',
                    [{'text': t} for t in er_attr_texts(fields)], stereotype='Entity')
        at = er_attr_texts(fields)
        attr_text[name] = at
        w = max(172, max(len(a) for a in at) * 6.9 + 40)
        h = 30 + 13 * len(at) + 12
        sizes[name] = (w, h)
    rows = 3
    cols = 5
    col_w = [0] * cols
    row_h = [0] * rows
    for name, (r, c) in ER_GRID.items():
        w, h = sizes[name]
        col_w[c] = max(col_w[c], w)
        row_h[r] = max(row_h[r], h)
    left = [50.0]
    for c in range(1, cols):
        left.append(left[-1] + col_w[c - 1] + 100.0)
    top = [50.0]
    for r in range(1, rows):
        top.append(top[-1] + row_h[r - 1] + 95.0)
    boxes, attrs = {}, {}
    for name, fields in ER_ENTITIES:
        r, c = ER_GRID[name]
        w, h = sizes[name]
        boxes['E_' + name] = (left[c], top[r], w, h)
        attrs['E_' + name] = attr_text[name]
    edges = [('E_' + a, 'E_' + b2, '%s  [%s..%s]' % (lbl, ca, cb))
             for a, b2, lbl, ca, cb in ER_RELS]
    b.add_diagram('ER Diagram - 15 MongoDB Collections (real FKs)', boxes, attrs, edges)


# ---------------------------------------------------------- DFD --------------
DFD_PX = [250.0, 480.0, 710.0]     # process column x
DFD_PROW = 70.0                    # first process row top
DFD_PSTEP = 120.0                  # row step
DFD_PW, DFD_PH = 180.0, 46.0
DFD_SX = [160.0, 380.0, 600.0, 820.0, 1040.0, 1260.0]  # store slots
DFD_STOP = 640.0
DFD_SW, DFD_SH = 170.0, 34.0
DFD_EXL_X, DFD_EXR_X = 30.0, 905.0
DFD_EXW, DFD_EXH = 150.0, 44.0


def _dfd(b, title, tag, procs, stores, ext, flows):
    def pre(k):
        return tag + k
    for num, name in procs:
        b.add_class(pre('P' + num.replace('.', '_')), '%s  %s' % (num, name), [],
                    stereotype='process')
    for dnum, name in stores:
        b.add_class(pre('S' + dnum), '%s  %s' % (dnum, name), [],
                    stereotype='dataStore')
    for i, (ename, side, rank) in enumerate(ext):
        b.add_class(pre('X%d' % i), ename, [], stereotype='externalEntity')
    boxes = {}
    if len(procs) == 1:
        num, name = procs[0]
        key = pre('P' + num.replace('.', '_'))
        boxes[key] = (440.0, 210.0, DFD_PW, DFD_PH)
    else:
        # processes: grid 3 per row
        for i, (num, name) in enumerate(procs):
            r, c = divmod(i, 3)
            key = pre('P' + num.replace('.', '_'))
            boxes[key] = (DFD_PX[c], DFD_PROW + r * DFD_PSTEP, DFD_PW, DFD_PH)
    # stores: bottom rows of 6
    for i, (dnum, name) in enumerate(stores):
        r, c = divmod(i, 6)
        key = pre('S' + dnum)
        boxes[key] = (DFD_SX[c], DFD_STOP + r * 60.0, DFD_SW, DFD_SH)
    # externals: left / right columns
    lc = rc = 0
    for i, (ename, side, rank) in enumerate(ext):
        x = DFD_EXL_X if side == 'L' else DFD_EXR_X
        y = 70.0 + rank * 150.0
        key = pre('X%d' % i)
        boxes[key] = (x, y, DFD_EXW, DFD_EXH)
    remapped = []
    for s, d, lbl in flows:
        remapped.append((pre(s), pre(d), lbl))
    b.add_diagram(title, boxes, {}, remapped)


def build_dfd0(b):
    _dfd(b, 'DFD Level 0 - Context', 'C0',
         [('1.0', 'RakshaSafe Platform')],
         [],
         [('USER (Citizen)', 'L', 0), ('ADMINISTRATOR', 'L', 1), ('WEATHER API', 'L', 2),
          ('RESPONDER', 'R', 0), ('OPENSTREETMAP', 'R', 1), ('AI RISK SERVICE', 'R', 2)],
         [('X0', 'P1_0', 'credentials, SOS, contacts, unsafe report, GPS'),
          ('P1_0', 'X0', 'JWT session, status, notifications, nearby list'),
          ('X1', 'P1_0', 'login, manage users/incidents/teams, reports'),
          ('P1_0', 'X1', 'dashboard stats, queues, reports, audit'),
          ('P1_0', 'X2', 'incident coordinates'),
          ('X2', 'P1_0', 'current weather data'),
          ('X3', 'P1_0', 'login, assignment status update'),
          ('P1_0', 'X3', 'assigned incidents, notifications'),
          ('X4', 'P1_0', 'nearby facility query / reverse geocode'),
          ('P1_0', 'X4', 'facility list + distance, address'),
          ('X5', 'P1_0', 'incident inputs + location factors'),
          ('P1_0', 'X5', 'risk score + level')])


def build_dfd1_user(b):
    _dfd(b, 'DFD Level 1 - User Domain', 'U1',
         [('1.0', 'Account & Access'), ('2.0', 'Incident (SOS) Management'),
          ('3.0', 'Emergency Contacts'), ('4.0', 'Resource Directory'),
          ('5.0', 'Unsafe-Area Reporting'), ('6.0', 'Notification Feed')],
         [('D1', 'Users'), ('D2', 'Locations'), ('D3', 'Incidents'),
          ('D4', 'IncidentUpdates'), ('D5', 'EmergencyContacts'),
          ('D6', 'Notifications'), ('D7', 'Facilities'), ('D8', 'RescueTeams'),
          ('D9', 'UnsafeAreaReports'), ('D10', 'RiskAssessments'), ('D11', 'RiskZones')],
         [('USER', 'L', 0)],
         [('X0', 'P1_0', 'credentials'), ('X0', 'P2_0', 'SOS + GPS'),
          ('X0', 'P3_0', 'contacts data'), ('X0', 'P5_0', 'unsafe report'),
          ('P1_0', 'SD1', 'write profile'), ('P2_0', 'SD3', 'store incident'),
          ('P2_0', 'SD4', 'store updates'), ('P2_0', 'SD2', 'read/write location'),
          ('P3_0', 'SD5', 'store contacts'), ('P4_0', 'SD7', 'read facilities'),
          ('P4_0', 'SD8', 'read teams'), ('P5_0', 'SD9', 'store report'),
          ('P6_0', 'SD6', 'read feed'), ('P2_0', 'SD10', 'write risk'),
          ('P2_0', 'SD11', 'read zones')])


def build_dfd1_admin(b):
    _dfd(b, 'DFD Level 1 - Admin Domain', 'A1',
         [('1.0', 'Dashboard & Analytics'), ('2.0', 'Incident Administration'),
          ('3.0', 'User & Contact Admin'), ('4.0', 'Master Data'),
          ('5.0', 'Unsafe-Report Moderation + Risk'), ('6.0', 'Reports & Audit')],
         [('D1', 'Users'), ('D2', 'Incidents'), ('D3', 'Locations'),
          ('D4', 'IncidentUpdates'), ('D5', 'RescueTeams'), ('D6', 'RescueAssignments'),
          ('D7', 'Facilities'), ('D8', 'UnsafeAreaReports'), ('D9', 'RiskAssessments'),
          ('D10', 'Reports'), ('D11', 'AdminLogs'), ('D12', 'Notifications')],
         [('ADMINISTRATOR', 'R', 0)],
         [('X0', 'P1_0', 'login'), ('X0', 'P2_0', 'manage incidents'),
          ('X0', 'P3_0', 'manage users/contacts'), ('X0', 'P4_0', 'facility/team CRUD'),
          ('X0', 'P5_0', 'moderate + verify'), ('X0', 'P6_0', 'generate reports'),
          ('P1_0', 'SD1', 'read stats'), ('P2_0', 'SD2', 'write'),
          ('P2_0', 'SD4', 'write'), ('P2_0', 'SD6', 'write'),
          ('P2_0', 'SD12', 'write notify'), ('P3_0', 'SD1', 'write'),
          ('P4_0', 'SD7', 'write'), ('P4_0', 'SD5', 'write'),
          ('P5_0', 'SD8', 'write'), ('P5_0', 'SD9', 'read risk'),
          ('P6_0', 'SD10', 'write'), ('P6_0', 'SD11', 'write audit'),
          ('P6_0', 'SD2', 'read data')])


def build_dfd2_user(b):
    _dfd(b, 'DFD Level 2 - SOS Creation (User)', 'U2',
         [('2.1', 'Input SOS details'), ('2.2', 'Resolve Location'),
          ('2.3', 'Review Request'), ('2.4', 'Create Incident'),
          ('2.5', 'Assess Risk'), ('2.6', 'Notify Contacts')],
         [('D2', 'Locations'), ('D3', 'Incidents'), ('D5', 'EmergencyContacts'),
          ('D6', 'Notifications'), ('D10', 'RiskAssessments'), ('D11', 'RiskZones')],
         [('USER', 'L', 0), ('OSM / NOMINATIM', 'R', 0), ('AI RISK SERVICE', 'R', 1)],
         [('X0', 'P2_1', 'type, category, description, priority'),
          ('P2_1', 'P2_2', 'confirm GPS / continue without location'),
          ('P2_2', 'X1', 'reverse geocode'), ('X1', 'P2_2', 'formatted address'),
          ('P2_2', 'P2_3', 'review request'), ('P2_3', 'P2_4', 'submit'),
          ('P2_4', 'SD3', 'store incident (REPORTED)'),
          ('P2_4', 'SD2', 'store location'),
          ('P2_4', 'X2', 'risk request'), ('X2', 'P2_5', 'risk score + level'),
          ('P2_5', 'SD10', 'store assessment'),
          ('P2_4', 'P2_6', 'trigger notification'),
          ('P2_6', 'SD5', 'read contacts'), ('P2_6', 'SD6', 'store delivery'),
          ('P2_4', 'SD11', 'read risk zones')])


def build_dfd2_admin(b):
    _dfd(b, 'DFD Level 2 - Incident Administration (Admin)', 'A2',
         [('2.1', 'Review Incident Queue'), ('2.2', 'Assign Rescue Team'),
          ('2.3', 'Update Status'), ('2.4', 'Review AI Risk Result'),
          ('2.5', 'Write Audit Trail')],
         [('D2', 'Incidents'), ('D4', 'IncidentUpdates'), ('D5', 'RescueTeams'),
          ('D6', 'RescueAssignments'), ('D9', 'RiskAssessments'),
          ('D11', 'AdminLogs'), ('D12', 'Notifications')],
         [('ADMINISTRATOR', 'L', 0)],
         [('X0', 'P2_1', 'view queue (status/priority filter)'),
          ('P2_1', 'SD2', 'read incidents'),
          ('P2_1', 'P2_2', 'assign team'),
          ('P2_2', 'SD5', 'read teams'), ('P2_2', 'SD6', 'store assignment'),
          ('P2_2', 'P2_3', 'status transition'),
          ('P2_3', 'SD2', 'write'), ('P2_3', 'SD4', 'write'),
          ('P2_3', 'SD12', 'write notify'),
          ('P2_3', 'P2_4', 'review risk'),
          ('P2_4', 'SD9', 'read assessment'),
          ('P2_4', 'P2_5', 'log action'),
          ('P2_5', 'SD11', 'write audit')])


def main():
    with open(MDJ, encoding='utf-8') as f:
        proj = json.load(f)
    proj['ownedElements'] = [m for m in proj['ownedElements']
                             if not (m.get('_type') == 'UMLModel' and m.get('name') == MODEL_NAME)]
    b = Builder(MODEL_NAME, proj['_id'])
    build_er(b)
    build_dfd0(b)
    build_dfd1_user(b)
    build_dfd1_admin(b)
    build_dfd2_user(b)
    build_dfd2_admin(b)
    proj['ownedElements'].append(dict(b.model))
    with open(MDJ, 'w', encoding='utf-8') as f:
        json.dump(proj, f, ensure_ascii=False, indent=2)
    print('rebuilt ER + 5 DFD diagrams in', MDJ)


if __name__ == '__main__':
    main()